import * as ohm from "ohm-js";

const aoGrammar = ohm.grammar(`
  Ao {
    Exp = OrExp
    
    OrExp = OrExp "||" AndExp  -- or
          | AndExp
    
    AndExp = AndExp "&&" CompExp  -- and
           | CompExp
    
    CompExp = AddExp "==" AddExp  -- eq
            | AddExp "!=" AddExp  -- neq
            | AddExp "<=" AddExp  -- lte
            | AddExp ">=" AddExp  -- gte
            | AddExp "<" AddExp   -- lt
            | AddExp ">" AddExp   -- gt
            | AddExp
    
    AddExp = AddExp "+" MulExp  -- add
           | AddExp "-" MulExp  -- sub
           | MulExp
    
    MulExp = MulExp "*" UnaryExp  -- mul
           | MulExp "/" UnaryExp  -- div
           | MulExp "%" UnaryExp  -- mod
           | UnaryExp
    
    UnaryExp = "!" CallExp  -- not
             | "-" CallExp  -- neg
             | CallExp
    
    CallExp = CallExp "." ident "(" ListOf<Exp, ","> ")"   -- methodCall
            | CallExp "?." ident "(" ListOf<Exp, ","> ")"  -- optMethodCall
            | CallExp "." ident                             -- propAccess
            | CallExp "?." ident                            -- optChain
            | CallExp "[" Exp "]"                           -- indexAccess
            | ident "(" ListOf<Exp, ","> ")"                -- funcCall
            | PrimaryExp
    
    PrimaryExp = "(" Exp ")"        -- paren
               | ArrayLiteral
               | ObjectLiteral
               | number
               | string
               | boolean
               | null
               | undefined
               | ident
    
    ArrayLiteral = "[" ListOf<Exp, ","> "]"
    
    ObjectLiteral = "{" ListOf<Property, ","> "}"
    
    Property = (ident | string) ":" Exp
    
    ident = letter (letter | digit | "_")*
    
    number = digit+ "." digit+  -- float
           | digit+              -- int
    
    string = "\\"" (~"\\"" any)* "\\""
           | "'" (~"'" any)* "'"
    
    boolean = "true" | "false"
    
    null = "null"
    
    undefined = "undefined"
    
    space += "//" (~"\\n" any)*  -- comment
  }
`);

/**
 * Ao - A tiny minimal typesafe language for DSL expressions
 * Uses Ohm grammar for proper parsing and evaluation
 */
export class Ao {
  private context: any;
  private static parseCache = new Map<string, any>();
  private static semanticsCache = new WeakMap<any, any>();

  constructor(context: any = {}) {
    this.context = context;
  }

  /**
   * Interpret an Ao expression with the given context
   */
  interpret(expression: string): any {
    try {
      let match = Ao.parseCache.get(expression);
      if (!match) {
        match = aoGrammar.match(expression);
        if (match.failed()) {
          console.error("Parse error:", match.message);
          return undefined;
        }
        Ao.parseCache.set(expression, match);
      }

      const semantics = this.createSemantics(this.context);
      return semantics(match).eval();
    } catch (error) {
      console.error("Evaluation error:", error);
      return undefined;
    }
  }

  /**
   * Create semantics with the given context
   */
  private createSemantics(context: any) {
    return aoGrammar.createSemantics().addOperation("eval", {
      Exp(e) {
        return e.eval();
      },

      OrExp_or(left, _, right) {
        const l = left.eval();
        return l || right.eval();
      },

      AndExp_and(left, _, right) {
        const l = left.eval();
        return l && right.eval();
      },

      CompExp_eq(left, _, right) {
        return left.eval() == right.eval();
      },
      CompExp_neq(left, _, right) {
        return left.eval() != right.eval();
      },
      CompExp_lte(left, _, right) {
        return left.eval() <= right.eval();
      },
      CompExp_gte(left, _, right) {
        return left.eval() >= right.eval();
      },
      CompExp_lt(left, _, right) {
        return left.eval() < right.eval();
      },
      CompExp_gt(left, _, right) {
        return left.eval() > right.eval();
      },

      AddExp_add(left, _, right) {
        return left.eval() + right.eval();
      },
      AddExp_sub(left, _, right) {
        return left.eval() - right.eval();
      },

      MulExp_mul(left, _, right) {
        return left.eval() * right.eval();
      },
      MulExp_div(left, _, right) {
        return left.eval() / right.eval();
      },
      MulExp_mod(left, _, right) {
        return left.eval() % right.eval();
      },

      UnaryExp_not(_, expr) {
        return !expr.eval();
      },
      UnaryExp_neg(_, expr) {
        return -expr.eval();
      },

      CallExp_methodCall(obj, _1, methodName, _2, args, _3) {
        const o = obj.eval();
        const method = o[methodName.sourceString];
        const argVals = args
          .asIteration()
          .children.map((arg: any) => arg.eval());
        if (typeof method === "function") {
          return method.apply(o, argVals);
        }
        return undefined;
      },

      CallExp_optMethodCall(obj, _1, methodName, _2, args, _3) {
        const o = obj.eval();
        if (o == null) return undefined;
        const method = o[methodName.sourceString];
        const argVals = args
          .asIteration()
          .children.map((arg: any) => arg.eval());
        if (typeof method === "function") {
          return method.apply(o, argVals);
        }
        return undefined;
      },

      CallExp_propAccess(obj, _, prop) {
        const o = obj.eval();
        return o == null ? undefined : o[prop.sourceString];
      },

      CallExp_optChain(obj, _, prop) {
        const o = obj.eval();
        return o == null ? undefined : o[prop.sourceString];
      },

      CallExp_indexAccess(obj, _1, index, _2) {
        return obj.eval()[index.eval()];
      },

      CallExp_funcCall(funcName, _1, args, _2) {
        const name = funcName.sourceString;
        const argVals = args
          .asIteration()
          .children.map((arg: any) => arg.eval());

        if (context && typeof context[name] === "function") {
          return context[name](...argVals);
        }

        return undefined;
      },

      PrimaryExp_paren(_1, exp, _2) {
        return exp.eval();
      },

      ArrayLiteral(_1, elems, _2) {
        return elems.asIteration().children.map((e: any) => e.eval());
      },

      ObjectLiteral(_1, props, _2) {
        const obj: any = {};
        props.asIteration().children.forEach((prop: any) => {
          const [key, value] = prop.eval();
          obj[key] = value;
        });
        return obj;
      },

      Property(key, _, value) {
        const keyNode = key.child(0);
        let k;
        if (keyNode.ctorName === "string") {
          k = keyNode.children[1].sourceString;
        } else {
          k = keyNode.sourceString;
        }
        return [k, value.eval()];
      },

      ident(_1, _2) {
        const name = this.sourceString;

        if (context && name in context) {
          return context[name];
        }

        return undefined;
      },

      number_float(_int, _dot, _dec) {
        return parseFloat(this.sourceString);
      },

      number_int(_) {
        return parseInt(this.sourceString);
      },

      string(_1, str, _2) {
        return str.sourceString;
      },

      boolean(b) {
        return b.sourceString === "true";
      },

      null(_) {
        return null;
      },

      undefined(_) {
        return undefined;
      },

      _terminal() {
        return this.sourceString;
      },
    });
  }

  /**
   * Static method for one-off evaluation
   */
  static eval(expression: string, context: any = {}): any {
    return new Ao(context).interpret(expression);
  }
}

export default Ao;
