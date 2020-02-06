# monads
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


// other examples

await some(5).map(x=> x + 4).wait(async x => x + 6).map(x=> x / 0).error(console.log).value();

function add(a : number, b : number){
	return a + b;
}

const addable = from(add);
addable(6,4).finally(console.log).value();

const addable = fromAsync(async x => await someFunction());
await addable(6).finally(console.log).value();

```

