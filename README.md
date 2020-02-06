# monads
Typescript monads

``` ts

// simple usage
from(4).map(x => x / 2).value() == 2;


// usage with decorator
class Power implements Unit<number> {
	constructor(private num : number, private num2 : number){

	}
	value() {
		return this.num * this.num2;
	}
}


from(2).flat(x => new Power(x, 2)).value() == 2;

```

