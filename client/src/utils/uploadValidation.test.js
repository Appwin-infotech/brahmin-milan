import test from "node:test";
import assert from "node:assert/strict";
import { MAX_IMAGE_SIZE, validateImageFiles, readUploadResponse } from "./imageValidation.js";
import { validateSubscriptionPlan } from "./subscriptionValidation.js";

const photo = (overrides = {}) => ({ name: "photo.jpg", type: "image/jpeg", size: 100, ...overrides });
const plan = { profileType: "Pandit", trialPeriod: 0, duration: "4", amount: "51", description: "Plan", photoUrl: "uploads/existing.jpg" };

test("accepts backend-supported image formats and the exact 5 MB boundary", () => {
  for (const [name, type] of [["photo.JPG", "image/jpeg"], ["photo.jpeg", "image/jpeg"], ["photo.png", "image/png"], ["photo.webp", "image/webp"]]) {
    assert.equal(validateImageFiles([photo({ name, type, size: MAX_IMAGE_SIZE })]), "");
  }
  assert.match(validateImageFiles([photo({ size: MAX_IMAGE_SIZE + 1 })]), /Maximum file size is 5 MB/);
});

test("rejects unsupported types, misleading extensions, and a bad file in a mixed selection", () => {
  for (const invalid of [photo({name: "photo.gif", type: "image/gif"}), photo({type: "text/plain"}), photo({name: "photo.svg"}), photo({name: "clip.mp4", type: "video/mp4"})]) {
    assert.match(validateImageFiles([photo(), invalid]), /JPG, JPEG, PNG, or WEBP/);
  }
});

test("checks required images, per-form counts, and remaining upload slots", () => {
  assert.equal(validateImageFiles([]), "");
  assert.match(validateImageFiles([], {required: true}), /required/);
  for (const count of [1, 3, 4, 5, 10]) {
    assert.equal(validateImageFiles(Array(count).fill(photo()), {maxFiles: count}), "");
    assert.match(validateImageFiles(Array(count + 1).fill(photo()), {maxFiles: count}), /no more than/);
  }
  assert.match(validateImageFiles([photo()], {maxFiles: 0}), /Remove an existing image/);
});

test("subscription creation requires a photo; editing can keep its current photo", () => {
  assert.match(validateSubscriptionPlan(plan, null, {creating: true}), /image is required/);
  assert.equal(validateSubscriptionPlan(plan, photo(), {creating: true}), "");
  assert.equal(validateSubscriptionPlan(plan, null), "");
  assert.match(validateSubscriptionPlan({...plan, photoUrl: ""}, null), /image is required/);
  assert.match(validateSubscriptionPlan(plan, photo({size: MAX_IMAGE_SIZE + 1})), /5 MB/);
});

test("subscription fields reject blanks and invalid numbers while allowing zero", () => {
  assert.equal(validateSubscriptionPlan(plan, photo()), "");
  for (const field of ["trialPeriod", "duration", "amount"]) {
    for (const value of ["", " ", "invalid", Infinity]) {
      assert.match(validateSubscriptionPlan({...plan, [field]: value}, photo()), /valid number/);
    }
  }
  assert.match(validateSubscriptionPlan({...plan, description: "  "}, photo()), /Description is required/);
  assert.match(validateSubscriptionPlan({...plan, profileType: "Other"}, photo()), /valid profile type/);
});

test("shows upload-limit and server validation errors instead of JSON parsing errors", async () => {
  await assert.rejects(readUploadResponse(new Response("<html>Too large</html>", {status: 413})), /Upload is too large/);
  await assert.rejects(readUploadResponse(Response.json({status: false, error: "All fields are required."}, {status: 400})), /All fields are required/);
  await assert.rejects(readUploadResponse(Response.json({message: "Session expired"}, {status: 401})), /Session expired/);
  await assert.rejects(readUploadResponse(new Response("<html>Error</html>", {status: 502})), /Unable to save/);
  await assert.rejects(readUploadResponse(new Response("invalid")), /invalid response/);
  assert.deepEqual(await readUploadResponse(Response.json({status: true})), {status: true});
});
