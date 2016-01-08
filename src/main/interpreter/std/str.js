import { Class } from '../../ast/class'
import { Evaluator } from '../../interpreter/evaluator'
import { Formal } from '../../ast/formal'
import { Method } from '../../ast/method'
import { MethodCall } from '../../ast/methodcall'
import { NativeExpression } from '../../ast/nativeexpression'
import { Obj } from '../../interpreter/object'
import { Reference } from '../../ast/reference'
import { Types } from '../../types/types'

export class StringClass extends Class {

    constructor() {
        super();

        this.name = Types.String;

        this.superClass = Types.Object;

        this.variables.push(new Formal('value', 'string'));

        this.methods.push(new Method('toString', [], Types.String,
            new NativeExpression((context) => {
                return context.self;
            }), true));

        this.methods.push(new Method('==', [new Formal('rhs', Types.Object)], Types.Bool,
            new NativeExpression((context) => {
                let rhs = context.store.get(context.environment.find('rhs'));
                let lhs = context.self;

                let result = Obj.create(context, Types.Bool);

                if (rhs.type !== Types.String) {
                    result.set('value', false);
                } else {
                    result.set('value', lhs.get('value') === rhs.get('value'));
                }

                return result;
            }), true));

        this.methods.push(new Method('+', [new Formal('rhs', Types.Object)], Types.String,
            new NativeExpression((context) => {
                let call = new MethodCall(new Reference('rhs'), 'toString', []);

                let rhs = Evaluator.evaluate(context, call);
                let lhs = context.self;

                let value = Obj.create(context, Types.String);

                value.set('value', lhs.get('value') + rhs.get('value'));

                return value;
            })));

        this.methods.push(new Method('at', [new Formal('index', Types.Int)], Types.String,
            new NativeExpression((context) => {
                let index = context.store.get(context.environment.find('index'));
                let self = context.self;

                let value = Obj.create(context, Types.String);

                value.set('value', self.get('value').charAt(index.get('value')));

                return value;
            })));

        this.methods.push(new Method('length', [], Types.Int,
            new NativeExpression((context) => {
                let value = Obj.create(context, Types.Int);

                value.set('value', context.self.get('value').length);

                return value;
            })));

        this.methods.push(new Method('contains', [new Formal('s', Types.String)], Types.Bool,
            new NativeExpression((context) => {
                let s = context.store.get(context.environment.find('s'));
                let self = context.self;

                let value = Obj.create(context, Types.Bool);

                value.set('value', self.get('value').search(s.get('value')) > 0);

                return value;
            })));

        this.methods.push(new Method('startsWith', [new Formal('s', Types.String)], Types.Bool,
            new NativeExpression((context) => {
                let s = context.store.get(context.environment.find('s'));
                let self = context.self;

                let value = Obj.create(context, Types.Bool);

                value.set('value', self.get('value').startsWith(s.get('value')));

                return value;
            })));

        this.methods.push(new Method('endsWith', [new Formal('s', Types.String)], Types.Bool,
            new NativeExpression((context) => {
                let s = context.store.get(context.environment.find('s'));
                let self = context.self;

                let value = Obj.create(context, Types.Bool);

                value.set('value', self.get('value').endsWith(s.get('value')));

                return value;
            })));

        this.methods.push(new Method('indexOf', [new Formal('s', Types.String)], Types.Int,
            new NativeExpression((context) => {
                let s = context.store.get(context.environment.find('s'));
                let self = context.self;

                let value = Obj.create(context, Types.Int);

                value.set('value', self.get('value').indexOf(s.get('value')));

                return value;
            })));

        this.methods.push(new Method('toUpper', [], Types.String,
            new NativeExpression((context) => {
                let value = Obj.create(context, Types.String);

                value.set('value', context.self.get('value').toUpperCase());

                return value;
            })));

        this.methods.push(new Method('toLower', [], Types.String,
            new NativeExpression((context) => {
                let value = Obj.create(context, Types.String);

                value.set('value', context.self.get('value').toLowerCase());

                return value;
            })));

        this.methods.push(new Method('substring', [new Formal('start', Types.Int)], Types.String,
            new NativeExpression((context) => {
                let start = context.store.get(context.environment.find('start'));

                let value = Obj.create(context, Types.String);

                value.set('value', context.self.get('value').substring(start.get('value')));

                return value;
            })));

        this.methods.push(new Method('substring', [new Formal('start', Types.Int), new Formal('end', Types.Int)], Types.String,
            new NativeExpression((context) => {
                let start = context.store.get(context.environment.find('start'));
                let end = context.store.get(context.environment.find('end'));

                let value = Obj.create(context, Types.String);

                value.set('value', context.self.get('value').substring(start.get('value'), end.get('value')));

                return value;
            })));

        this.methods.push(new Method('trim', [], Types.String,
            new NativeExpression((context) => {
                let value = Obj.create(context, Types.String);

                value.set('value', context.self.get('value').trim());

                return value;
            })));

        this.methods.push(new Method('replace', [new Formal('oldSub', Types.String), new Formal('newSub', Types.String)], Types.String,
            new NativeExpression((context) => {
                let oldSub = context.store.get(context.environment.find('oldSub'));
                let newSub = context.store.get(context.environment.find('newSub'));
                let self = context.self;

                let value = Obj.create(context, Types.String);

                value.set('value', self.get('value').replace(oldSub.get('value'), newSub.get('value')));

                return value;
            })));
    }
}