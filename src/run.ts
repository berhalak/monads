import { lift } from ".";

const t = lift(lift(5)).map(x => x + 6);
const v = t.value();
console.log(v);