import { Some, Identity, Maybe, Accessor, Lift, some, none, wait, from, Unit } from ".";

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

console.log("Started...");

async function main() {



	try {


		class Person {
			name = "bob";
		}

		let i = 0;


		class Employee {
			constructor(private name: string) {
				i++;
			}
		}


		class EmployeePerson {
			constructor(private p: Person) {

			}
			value() {
				return new Employee(this.p.name);
			}
		}

		async function get(): Promise<Person> {
			return new Person();
		}



		const emp =
			some(() => get()).wait()
				.flat(x => new EmployeePerson(x));

		emp.value();
		emp.value();
		emp.value();
		emp.value();
		emp.value();
		emp.value();

		equals(0, i);


	} finally {
		console.log("Finished");
	}
}

main();
