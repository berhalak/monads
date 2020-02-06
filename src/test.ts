import { Some } from ".";

function test(condition: boolean) {
	if (!condition) {
		console.error("Error in test");
	} else {
		console.log("Test passed");
	}
}

function equals(a: any, b: any) {
	if (a != b) {
		console.error(`Expected ${a} == ${b}`)
	} else {
		console.log("Test passed");
	}
}

equals(2, new Some(1).map(x => x + 1).value());