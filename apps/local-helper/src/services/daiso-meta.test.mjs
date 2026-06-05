import assert from "node:assert/strict";
import {
  hasMeaningfulInventoryKeyword,
  isDaisoInventoryConceptQuestion,
  isDaisoMetaQuestion,
} from "./daiso-utils.mjs";

assert.equal(isDaisoMetaQuestion(""), true);
assert.equal(isDaisoMetaQuestion("이건 무슨 기능이야"), true);
assert.equal(isDaisoMetaQuestion("Daiso CLI 사용법 알려줘"), true);
assert.equal(isDaisoMetaQuestion("what is this feature"), true);
assert.equal(isDaisoMetaQuestion("마스크 제품 찾아줘"), false);
assert.equal(isDaisoMetaQuestion("강남역 근처 매장"), false);

assert.equal(isDaisoInventoryConceptQuestion("재고 확인은 뭘 말하는거"), true);
assert.equal(isDaisoInventoryConceptQuestion("what is inventory check"), true);
assert.equal(isDaisoInventoryConceptQuestion("강남역 마스크 재고"), false);

assert.equal(hasMeaningfulInventoryKeyword("마스크"), true);
assert.equal(hasMeaningfulInventoryKeyword("재고"), false);
assert.equal(hasMeaningfulInventoryKeyword(""), false);

console.log("daiso-meta.test.mjs passed");
