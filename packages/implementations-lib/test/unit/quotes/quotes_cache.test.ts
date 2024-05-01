/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

 "use strict";
 
import { QuotesCache } from "../../../src/quotes/quotes_cache"

describe("Implementations - Mongo Quotes Cache Unit Tests", () => {
	let cache: any;

	beforeEach(() => {
		cache = new QuotesCache();
	});

	afterEach(() => {
		cache.clear();
	});

	test("should store and retrieve values correctly", () => {
		// Arrange & Act
		cache.set("key1", "value1");
		
		// Assert
		expect(cache.get("key1")).toBe("value1");
	});

	test("should overwrite existing value for a key", () => {
		// Arrange & Act
		cache.set("key1", "value1");
		cache.set("key1", "value2");
		
		// Assert
		expect(cache.get("key1")).toBe("value2");
	});

	test("should return undefined for non-existing key", () => {
		// Assert
		expect(cache.get("nonExistingKey")).toBeUndefined();
	});

	test("should remove a key from the cache", () => {
		// Arrange & Act
		cache.set("key1", "value1");
		cache.delete("key1");

		// Assert
		expect(cache.get("key1")).toBeUndefined();
	});

	test("should return false for non-existing key", () => {
		// Assert
		expect(cache.delete("nonExistingKey")).toBe(false);
	});

	test("should remove all keys from the cache", () => {
		// Arrange & Act
		cache.set("key1", "value1");
		cache.set("key2", "value2");
		cache.clear();

		// Assert
		expect(cache.size).toBe(0);
	});

	test("should return an iterable of values", () => {
		// Arrange & Act
		cache.set("key1", "value1");
		cache.set("key2", "value2");
		const values = Array.from(cache.values());

		// Assert
		expect(values).toEqual(["value1", "value2"]);
	});

	test("should return the number of keys in the cache", () => {
		// Arrange & Act
		cache.set("key1", "value1");
		cache.set("key2", "value2");

		// Assert
		expect(cache.size).toBe(2);
	});
});