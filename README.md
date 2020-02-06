# ts-template
Typescript monads

``` ts

const two = new Some(1).map(x=> x + 1).value();
const aTwo = await new Some(1).wait(async x => x + 1).value();

class Model extends Identity {

}

class View extends Identity {
  constructor(model : Model){

  }
}

const view = new Model().map(x => new View()).value();
const view = new Model().pipe(View).value();
const view = await new Model().map(async x => new View()).value();

```

