import { from } from ".";

const t = from(from(5)).map(x => x + 6);
const v = t.value();
console.log(v);