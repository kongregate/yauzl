/* jshint esnext:true */

const expect = require('chai').expect;

const WHOLE_LENGTH = 30,
	CACHE_POSITION = 10,
	CACHE_LENGTH = 10;

describe('readAndAssertNoEofWithCached', function() {
	describe('read within cache', function() {
		it('entirety of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 10, len: 10};
			const expected = {
				fromReader: [],
				fromCache: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
				buffStr: '255 10 11 12 13 14 15 16 17 18 19 255'
			};
			runTest(params, expected, cb);
		});

		it('start of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 10, len: 5};
			const expected = {
				fromReader: [],
				fromCache: [10, 11, 12, 13, 14],
				buffStr: '255 10 11 12 13 14 255'
			};
			runTest(params, expected, cb);
		});

		it('end of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 15, len: 5};
			const expected = {
				fromReader: [],
				fromCache: [15, 16, 17, 18, 19],
				buffStr: '255 15 16 17 18 19 255'
			};
			runTest(params, expected, cb);
		});

		it('middle of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 12, len: 5};
			const expected = {
				fromReader: [],
				fromCache: [12, 13, 14, 15, 16],
				buffStr: '255 12 13 14 15 16 255'
			};
			runTest(params, expected, cb);
		});
	});

	describe('read before + within cache', function() {
		it('entirety of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 7, len: 13};
			const expected = {
				fromReader: [7, 8, 9],
				fromCache: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
				buffStr: '255 107 108 109 10 11 12 13 14 15 16 17 18 19 255'
			};
			runTest(params, expected, cb);
		});

		it('part of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 7, len: 8};
			const expected = {
				fromReader: [7, 8, 9],
				fromCache: [10, 11, 12, 13, 14],
				buffStr: '255 107 108 109 10 11 12 13 14 255'
			};
			runTest(params, expected, cb);
		});
	});

	describe('read within + after cache', function() {
		it('entirety of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 10, len: 13};
			const expected = {
				fromReader: [20, 21, 22],
				fromCache: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
				buffStr: '255 10 11 12 13 14 15 16 17 18 19 120 121 122 255'
			};
			runTest(params, expected, cb);
		});

		it('part of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 17, len: 8};
			const expected = {
				fromReader: [20, 21, 22, 23, 24],
				fromCache: [17, 18, 19],
				buffStr: '255 17 18 19 120 121 122 123 124 255'
			};
			runTest(params, expected, cb);
		});
	});

	describe('read before + within + after cache', function() {
		it('entirety of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 7, len: 16};
			const expected = {
				fromReader: [7, 8, 9, 20, 21, 22],
				fromCache: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
				buffStr: '255 107 108 109 10 11 12 13 14 15 16 17 18 19 120 121 122 255'
			};
			runTest(params, expected, cb);
		});
	});

	describe('read before cache', function() {
		it('to edge of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 5, len: 5};
			const expected = {
				fromReader: [5, 6, 7, 8, 9],
				fromCache: [],
				buffStr: '255 105 106 107 108 109 255'
			};
			runTest(params, expected, cb);
		});

		it('ending before cache start', function(cb) {
			const params = {offset: 1, tail: 1, pos: 4, len: 5};
			const expected = {
				fromReader: [4, 5, 6, 7, 8],
				fromCache: [],
				buffStr: '255 104 105 106 107 108 255'
			};
			runTest(params, expected, cb);
		});
	});

	describe('read after cache', function() {
		it('from edge of cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 20, len: 5};
			const expected = {
				fromReader: [20, 21, 22, 23, 24],
				fromCache: [],
				buffStr: '255 120 121 122 123 124 255'
			};
			runTest(params, expected, cb);
		});

		it('starting after cache end', function(cb) {
			const params = {offset: 1, tail: 1, pos: 21, len: 5};
			const expected = {
				fromReader: [21, 22, 23, 24, 25],
				fromCache: [],
				buffStr: '255 121 122 123 124 125 255'
			};
			runTest(params, expected, cb);
		});
	});

	describe('read zero length', function() {
		it('no cache', function(cb) {
			const params = {offset: 1, tail: 1, pos: 20, len: 0};
			const expected = {
				fromReader: [],
				fromCache: [],
				buffStr: '255 255'
			};
			runTest(params, expected, cb);
		});
	});
});

function runTest(params, expected, cb) {
	// Initialize source buffer
	const bWhole = new Buffer(WHOLE_LENGTH);
	for (let i = 0; i < WHOLE_LENGTH; i++) {
		bWhole.writeUInt8(i, i);
	}

	// Initialize cache buffer
	const bCache = new Buffer(CACHE_LENGTH);
	for (let i = 0; i < CACHE_LENGTH; i++) {
		bCache.writeUInt8(bWhole.readUInt8(CACHE_POSITION + i), i);
	}

	const fromCache = [];
	const copyOriginal = bCache.copy;
	bCache.copy = function(target, targetStart, sourceStart, sourceEnd) {
		if (sourceEnd <= sourceStart) throw new Error('sourceEnd less than or equal to sourceEnd');

		for (let i = sourceStart; i < sourceEnd; i++) {
			fromCache.push(i + CACHE_POSITION);
		}

		return copyOriginal.apply(this, arguments);
	};

	// Initialize reader
	const fromReader = [];
	const reader = {
		read: function(buffer, offset, length, position, callback) {
			for (let i = 0; i < length; i++) {
				fromReader.push(position + i);
				buffer.writeUInt8(bWhole.readUInt8(position + i) + 100, offset + i);
			}
			callback();
		}
	};

	// Init output buffer
	const outLen = params.offset + params.len + params.tail;
	const b = new Buffer(outLen);
	for (let i = 0; i < outLen; i++) {
		b.writeUInt8(255, i);
	}

	// Call readAndAssertNoEofWithCache
	readAndAssertNoEofWithCache(reader, b, params.offset, params.len, params.pos, bCache, CACHE_POSITION, function(err) {
		if (err) throw err;
		expect(fromReader).to.deep.equal(expected.fromReader);
		expect(fromCache).to.deep.equal(expected.fromCache);
		expect(bufferToString(b)).to.equal(expected.buffStr);
		cb();
	});
}

function bufferToString(b) {
	const arr = [];
	for (let i = 0; i < b.length; i++) {
		let v = b.readUInt8(i) + '';
		if (v.length == 1) v = `0${v}`;
		arr[i] = v;
	}
	return arr.join(' ');
}

function readAndAssertNoEofWithCache(reader, buffer, offset, length, position, cacheBuffer, cachePosition, callback) {
  var end = position + length,
    cacheLength = cacheBuffer.length,
    cacheEnd = cachePosition + cacheLength;

  if (length === 0) {
    readAndAssertNoEof(reader, buffer, offset, length, position, callback);
  } else if (cachePosition <= position && cacheEnd >= end) {
  	// whole of read cached
	cacheBuffer.copy(buffer, offset, position - cachePosition, end - cachePosition);
	callback();
  } else if (cachePosition <= position && cacheEnd > position) {
    // start of read cached
	cacheBuffer.copy(buffer, offset, position - cachePosition, cacheLength);
	readAndAssertNoEof(reader, buffer, offset + cacheEnd - position, end - cacheEnd, cacheEnd, callback);
  } else if (cachePosition < end && cacheEnd >= end) {
    // end of read cached
	cacheBuffer.copy(buffer, offset + cachePosition - position, 0, end - cachePosition);
	readAndAssertNoEof(reader, buffer, offset, cachePosition - position, position, callback);
  } else if (cachePosition > position && cacheEnd < end) {
    // middle of read cached
	cacheBuffer.copy(buffer, offset + cachePosition - position, 0, cacheLength);
	readAndAssertNoEof(reader, buffer, offset, cachePosition - position, position, function(err) {
	  if (err) return callback(err);
	  readAndAssertNoEof(reader, buffer, offset + cacheEnd - position, end - cacheEnd, cacheEnd, callback);
	});
  } else {
	// none of read cached
    readAndAssertNoEof(reader, buffer, offset, length, position, callback);
  }
}

function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
  if (length === 0) {
    // fs.read will throw an out-of-bounds error if you try to read 0 bytes from a 0 byte file
    return setImmediate(function() { callback(null, new Buffer(0)); });
  }
  reader.read(buffer, offset, length, position, function(err, bytesRead) {
    if (err) return callback(err);
    if (bytesRead < length) {
      return callback(new Error("unexpected EOF"));
    }
    callback();
  });
}
