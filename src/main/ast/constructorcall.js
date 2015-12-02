import { Expression } from './expression'

export class ConstructorCall extends Expression {

    constructor(type, args = [], expressionType) {
        super(expressionType);

        this.type = type;
        this.args = args;
    }

    isConstructorCall() {
        return true;
    }
}