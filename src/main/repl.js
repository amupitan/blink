import * as fs from 'fs'
import * as process from 'process'
import * as readline from 'readline'
import { BinaryExpression } from './ast/binaryexpression'
import { BoolClass } from './interpreter/std/bool'
import { Context } from './interpreter/context'
import { DoubleClass } from './interpreter/std/double'
import { Evaluator } from './interpreter/evaluator'
import { Formal } from './ast/formal'
import { IntClass } from './interpreter/std/int'
import { IntegerLiteral } from './ast/integer'
import { Lexer } from './lexer/lexer'
import { Method } from './ast/method'
import { MethodCall } from './ast/methodcall'
import { NullClass } from './interpreter/std/null'
import { Obj } from './interpreter/object'
import { ObjectClass } from './interpreter/std/obj'
import { Parser } from './parser/parser'
import { PredefClass } from './interpreter/std/predef'
import { Program } from './ast/program'
import { Reference } from './ast/reference'
import { StringClass } from './interpreter/std/str'
import { Symbol } from './semanticanalysis/symbol'
import { TokenType } from './lexer/tokentype'
import { TypeChecker } from './semanticanalysis/typechecker'
import { TypeEnvironment } from './semanticanalysis/typeenvironment'
import { Types } from './types/types'
import { TypesUtils } from './types/typesutils'
import { UnitClass } from './interpreter/std/unit'

export class Repl {

    constructor() {
        this.typeEnvironment = new TypeEnvironment();
        this.context = new Context();

        this.predefClass = new PredefClass();

        this.typeEnvironment.currentClass = this.predefClass;

        this.typeEnvironment.addClass(this.predefClass);
        this.context.addClass(this.predefClass);

        this.loadClasses();

        this.predef = Obj.create(this.context, Types.Predef);

        this.context.self = this.predef;

        this.typeEnvironment.symbolTable.enterScope();

        this.context.environment.enterScope();

        this.res = 0;
    }

    run() {
        console.log('Welcome to Blink 0.0.1');
        console.log('Type in expressions to have them evaluated.');
        console.log('Type :quit to quit.');

        console.log();
        console.log();

        let prev = ' ';

        let input = '';

        let scanner = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        scanner.setPrompt('blink> ');

        scanner.prompt();

        scanner.on('line', (line) => {
            line = line.trim();

            if (line === ':quit') {
                scanner.close();

                process.exit();

            } else if (line.startsWith(':load')) {
                this.runLoadCommand(line, scanner);

            } else {

                if (line === '' && prev === '') {
                    console.log('Two blank lines typed. Starting a new expression.');
                    console.log();

                    input = '';
                    scanner.setPrompt('blink> ');

                } else {
                    prev = line;

                    input += line;

                    try {
                        if (!this.tryParse(input)) {
                            input += '\n';
                            scanner.setPrompt('      | ');

                        } else {
                            console.log(this.execute(input));
                            console.log();

                            input = '';
                            scanner.setPrompt('blink> ');
                        }
                    } catch (e) {
                        console.log(`error: ${e.message}`);
                        console.log();

                        input = '';
                        scanner.setPrompt('blink> ');
                    }
                }

                scanner.prompt();
            }
        });

        scanner.on('close', () => {
            console.log();
            console.log('Thanks for playing around!');
        });
    }

    execute(input) {
        let lexer = new Lexer(input);

        switch (lexer.nextToken().type) {
            case TokenType.Class:
                return this.injectClass(input);

            case TokenType.Var:
                return this.injectProperty(input);

            case TokenType.Func:
                return this.injectFunction(input);

            default:
                return this.evaluateExpression(input);
        }
    }

    evaluateExpression(input) {
        let parser = new Parser(input);

        let expression = parser.parseExpression();

        TypeChecker.typeCheck(this.typeEnvironment, expression);

        let value = Evaluator.evaluate(this.context, expression);

        let identifier;

        if (expression.isReference()) {
            identifier = expression.identifier;

        } else if (expression.isAssignment()) {
            identifier = expression.identifier;

            value = this.context.self.get(identifier);

        } else {
            identifier = `res${this.res++}`;

            this.typeEnvironment.symbolTable.add(new Symbol(identifier, value.type));

            let address = this.context.store.alloc(value);

            this.context.environment.add(identifier, address);
        }

        if (value.type === Types.String) {
            return`${identifier}: ${value.type} = "${value.get('value')}"`;
        }

        let call = new MethodCall(new Reference(identifier), 'toString', []);

        let res = Evaluator.evaluate(this.context, call);

        return `${identifier}: ${value.type} = ${res.get('value')}`;
    }

    injectClass(input) {
        let parser = new Parser(input);

        let klass = parser.parseClass();

        this.typeEnvironment.addClass(klass);

        try {
            TypeChecker.typeCheckClass(this.typeEnvironment, klass);

        } catch (e) {
            this.typeEnvironment.removeClass(klass.name);

            throw e;
        }

        this.context.addClass(klass);

        return `defined class ${klass.name}`;
    }

    injectProperty(input) {
        let parser = new Parser(input);

        let property = parser.parseVariable();

        let index = this.predefClass.variables.findIndex((variable) => variable.name === property.name);
        if (index !== -1) {
            this.predefClass.variables.splice(index, 1);
        }

        TypeChecker.typeCheckVariable(this.typeEnvironment, property);

        this.predefClass.variables.push(property);

        this.predef.properties.set(property.name, Evaluator.evaluate(this.context, property.value));

        let call = new MethodCall(new Reference(property.name), 'toString', []);

        let res = Evaluator.evaluate(this.context, call);

        return `${property.name}: ${property.value.expressionType} = ${res.get('value')}`;
    }

    injectFunction(input) {
        let parser = new Parser(input);

        let func = parser.parseMethod();

        let index = this.predefClass.methods.findIndex((f) => func.equals(f));
        if (index !== -1) {
            this.predefClass.methods.splice(index, 1);
        }

        index = this.predef.methods.findIndex((f) => func.equals(f));
        if (index !== -1) {
            this.predef.methods.splice(index, 1);
        }

        this.predefClass.methods.push(func);

        this.predef.methods.push(func);

        TypeChecker.typeCheckMethod(this.typeEnvironment, func);

        return func.signature();
    }

    runLoadCommand(cmd, scanner) {
        let args = cmd.split(/\s+/);
        let count = args.length;

        if (count <= 1) {
            console.log('error: no file provided.');
            console.log();

        } else {
            try {
                let program = new Program();

                for (let i = 1; i < count; ++i) {
                    program.classes = program.classes.concat(this.loadFile(args[i]).classes);
                }

                TypeChecker.typeCheckProgram(this.typeEnvironment, program);

                this.typeEnvironment.symbolTable.enterScope();

                program.classes.forEach((klass) => {
                    this.context.addClass(klass);

                    console.log(`defined class ${klass.name}.`);
                });

                console.log();

            } catch (e) {
                console.log(`error: ${e.message}`);
                console.log();
            }
        }

        scanner.prompt();
    }

    loadFile(filePath) {
        let parser = new Parser(fs.readFileSync(filePath, 'utf-8'));

        return parser.parseProgram();
    }

    tryParse(input) {
        let parser = new Parser(input);

        try {
            if (parser.accept(TokenType.Class)) {
                parser.parseClass();

            } else if (parser.accept(TokenType.Var)) {
                parser.parseVariable();

            } else if (parser.accept(TokenType.Func)) {
                parser.parseMethod();

            } else {
                parser.parseExpression();
            }

            return true;
        } catch (e) {
            if (e.message.search('end of input.') > 0) {
                return false;
            } else {
                throw e;
            }
        }
    }

    loadClasses() {
        let objectClass = new ObjectClass();
        let boolClass = new BoolClass();
        let intClass = new IntClass();
        let doubleClass = new DoubleClass();
        let stringClass = new StringClass();
        let unitClass = new UnitClass();
        let nullClass = new NullClass();

        this.typeEnvironment.addClass(objectClass);
        this.typeEnvironment.addClass(boolClass);
        this.typeEnvironment.addClass(intClass);
        this.typeEnvironment.addClass(doubleClass);
        this.typeEnvironment.addClass(stringClass);
        this.typeEnvironment.addClass(unitClass);
        this.typeEnvironment.addClass(nullClass);

        this.context.addClass(objectClass);
        this.context.addClass(boolClass);
        this.context.addClass(intClass);
        this.context.addClass(doubleClass);
        this.context.addClass(stringClass);
        this.context.addClass(unitClass);
        this.context.addClass(nullClass);
    }
}