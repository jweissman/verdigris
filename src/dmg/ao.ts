import * as ohm from 'ohm-js';

/**
 * Ao - A tiny, minimal, typesafe expression language
 * Interoperable with JavaScript contexts
 */

// Grammar definition for the Ao language
const aoGrammar = ohm.grammar(`
  Ao {
    Expression = OrExpr
    
    OrExpr = OrExpr "||" AndExpr  -- or
           | AndExpr
    
    AndExpr = AndExpr "&&" EqExpr  -- and
            | EqExpr
    
    EqExpr = RelExpr "==" RelExpr  -- eq
           | RelExpr "!=" RelExpr  -- neq
           | RelExpr
    
    RelExpr = AddExpr "<=" AddExpr  -- lte
            | AddExpr ">=" AddExpr  -- gte
            | AddExpr "<" AddExpr   -- lt
            | AddExpr ">" AddExpr   -- gt
            | AddExpr
    
    AddExpr = AddExpr "+" MulExpr  -- add
            | AddExpr "-" MulExpr  -- sub
            | MulExpr
    
    MulExpr = MulExpr "*" UnaryExpr  -- mul
            | MulExpr "/" UnaryExpr  -- div
            | UnaryExpr
    
    UnaryExpr = "-" UnaryExpr  -- neg
              | "!" UnaryExpr  -- not
              | PostfixExpr
    
    PostfixExpr = PostfixExpr "(" ListOf<Expression, ","> ")"  -- call
                | PostfixExpr "?." identifier  -- optchain
                | PostfixExpr "." identifier   -- member
                | PrimaryExpr
    
    PrimaryExpr = "(" Expression ")"  -- paren
                | number
                | string
                | boolean
                | null
                | identifier
    
    identifier = letter (letter | digit | "_")*
    
    number = digit+ ("." digit+)?
    
    string = "\\"" (~"\\"" any)* "\\""
           | "'" (~"'" any)* "'"
    
    boolean = "true" | "false"
    
    null = "null"
  }
`);

// Semantics for evaluating Ao expressions
const aoSemantics = aoGrammar.createSemantics();

aoSemantics.addOperation('eval(ctx)', {
  OrExpr_or(left, _, right) {
    return left.eval(this.args.ctx) || right.eval(this.args.ctx);
  },
  
  AndExpr_and(left, _, right) {
    return left.eval(this.args.ctx) && right.eval(this.args.ctx);
  },
  
  EqExpr_eq(left, _, right) {
    return left.eval(this.args.ctx) == right.eval(this.args.ctx);
  },
  
  EqExpr_neq(left, _, right) {
    return left.eval(this.args.ctx) != right.eval(this.args.ctx);
  },
  
  RelExpr_lte(left, _, right) {
    return left.eval(this.args.ctx) <= right.eval(this.args.ctx);
  },
  
  RelExpr_gte(left, _, right) {
    return left.eval(this.args.ctx) >= right.eval(this.args.ctx);
  },
  
  RelExpr_lt(left, _, right) {
    return left.eval(this.args.ctx) < right.eval(this.args.ctx);
  },
  
  RelExpr_gt(left, _, right) {
    return left.eval(this.args.ctx) > right.eval(this.args.ctx);
  },
  
  AddExpr_add(left, _, right) {
    return left.eval(this.args.ctx) + right.eval(this.args.ctx);
  },
  
  AddExpr_sub(left, _, right) {
    return left.eval(this.args.ctx) - right.eval(this.args.ctx);
  },
  
  MulExpr_mul(left, _, right) {
    return left.eval(this.args.ctx) * right.eval(this.args.ctx);
  },
  
  MulExpr_div(left, _, right) {
    return left.eval(this.args.ctx) / right.eval(this.args.ctx);
  },
  
  UnaryExpr_neg(_, expr) {
    return -expr.eval(this.args.ctx);
  },
  
  UnaryExpr_not(_, expr) {
    return !expr.eval(this.args.ctx);
  },
  
  PostfixExpr_call(func, _lparen, args, _rparen) {
    const fn = func.eval(this.args.ctx);
    if (typeof fn !== 'function') {
      throw new Error(`Not a function: ${func.sourceString}`);
    }
    const argVals = args.asIteration().children.map(arg => arg.eval(this.args.ctx));
    return fn(...argVals);
  },
  
  PostfixExpr_optchain(obj, _, prop) {
    const o = obj.eval(this.args.ctx);
    if (o == null) return null;
    return o[prop.sourceString];
  },
  
  PostfixExpr_member(obj, _, prop) {
    const o = obj.eval(this.args.ctx);
    if (o == null) return undefined;
    return o[prop.sourceString];
  },
  
  PrimaryExpr_paren(_lparen, expr, _rparen) {
    return expr.eval(this.args.ctx);
  },
  
  identifier(_first, _rest) {
    const name = this.sourceString;
    return this.args.ctx[name];
  },
  
  number(_digits, _decimal) {
    return parseFloat(this.sourceString);
  },
  
  string(_lquote, chars, _rquote) {
    return chars.sourceString;
  },
  
  boolean(b) {
    return b.sourceString === 'true';
  },
  
  null(_) {
    return null;
  }
});

/**
 * Ao interpreter - A minimal expression evaluator
 */
export class Ao {
  private static instance: Ao | null = null;
  private context: any = {};
  
  private constructor() {}
  
  static getInstance(): Ao {
    if (!Ao.instance) {
      Ao.instance = new Ao();
    }
    return Ao.instance;
  }
  
  /**
   * Interpret an expression with optional context
   */
  static interpret(expression: string, context: any = {}): any {
    return Ao.getInstance().withContext(context).evaluate(expression);
  }
  
  /**
   * Set the evaluation context
   */
  withContext(context: any): Ao {
    this.context = context;
    return this;
  }
  
  /**
   * Evaluate an expression in the current context
   */
  evaluate(expression: string): any {
    try {
      const match = aoGrammar.match(expression);
      if (!match.succeeded()) {
        throw new Error(`Parse error: ${match.message}`);
      }
      
      const semantics = aoSemantics(match);
      return semantics.eval(this.context);
    } catch (e) {
      console.error(`Failed to evaluate expression '${expression}':`, e);
      return false; // Safe default
    }
  }
  
  /**
   * Check if an expression is valid without evaluating
   */
  validate(expression: string): boolean {
    const match = aoGrammar.match(expression);
    return match.succeeded();
  }
}

// Export for convenience
iexport const ao = Ao.getInstance();