// Tiny minimal typesafe language whose expressions are interoperable with JavaScript (can take a simple Object as eval context, call functions on it etc)
class Ao {
  private static instance: Ao = new Ao();

  interpret(userInput: string, context: any = {}): any {
    Ao.instance.withContext(context).evaluates(userInput)
  }
}