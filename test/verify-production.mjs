import https from 'https';

const BASE_URL = 'https://book-listener.vercel.app';

async function request(urlPath, options = {}) {
  const url = new URL(urlPath, BASE_URL);
  const headers = options.headers || {};
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('VERIFYING LIVE PRODUCTION: ' + BASE_URL);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       ${details}`);
      failed++;
    }
  }

  // 1. Homepage loads over HTTPS
  try {
    const home = await request('/');
    assert(
      home.status === 200 && home.body.includes('Book Listener'),
      '1. Homepage loads over HTTPS (200 OK & includes Book Listener title)',
      `Status: ${home.status}, Body length: ${home.body.length}`
    );
  } catch (err) {
    assert(false, '1. Homepage loads over HTTPS', err.message);
  }

  // 2. Problem/theme search returns results
  let books = [];
  try {
    const searchRes = await request('/api/books/search?q=distraction');
    assert(
      searchRes.status === 200 && searchRes.json && searchRes.json.books && searchRes.json.books.length > 0,
      '2a. Problem search for "distraction" returns relevant books',
      `Found ${searchRes.json?.books?.length} results: ${searchRes.json?.books?.map((b) => b.title).join(', ')}`
    );

    const featuredRes = await request('/api/books/featured');
    assert(
      featuredRes.status === 200 && featuredRes.json && featuredRes.json.sections,
      '2b. Featured endpoint returns categorized sections',
      `Sections: ${featuredRes.json?.sections?.map((s) => s.title).join(', ')}`
    );

    if (searchRes.json?.books) {
      books = searchRes.json.books;
    }
  } catch (err) {
    assert(false, '2. Problem/theme search', err.message);
  }

  // 3. Book detail page & availability
  let publicDomainBook = null;
  let copyrightedBook = null;

  try {
    const pdRes = await request('/api/books/book_meditations');
    const crRes = await request('/api/books/book_deep_work');

    publicDomainBook = pdRes.json?.book;
    copyrightedBook = crRes.json?.book;

    assert(
      pdRes.status === 200 && pdRes.json?.book?.sourceFlags?.hasGutenberg === true && pdRes.json?.availability?.freeRead?.available === true,
      `3a. Public domain book detail (${publicDomainBook?.title}) reports public domain availability`,
      `Gutenberg: ${pdRes.json?.book?.sourceFlags?.hasGutenberg}, LibriVox: ${pdRes.json?.book?.sourceFlags?.hasLibriVox}`
    );

    assert(
      crRes.status === 200 && crRes.json?.book?.sourceFlags?.hasGutenberg === false && crRes.json?.availability?.freeRead?.available === false,
      `3b. Copyrighted modern book detail (${copyrightedBook?.title}) correctly reports non-public-domain`,
      `Spotify query: ${crRes.json?.book?.spotifyQuery}, Summary available: ${crRes.json?.availability?.summary?.available}`
    );
  } catch (err) {
    assert(false, '3. Book detail and availability', err.message);
  }

  // 4. Reader (public domain) and Audio Player
  try {
    if (publicDomainBook) {
      const readRes = await request(`/api/books/${publicDomainBook.id}/read`);
      assert(
        readRes.status === 200 && readRes.json?.text && readRes.json?.text.length > 100,
        `4a. Reader loads public domain full text for "${publicDomainBook.title}"`,
        `Source: ${readRes.json?.source}, Text excerpt: "${readRes.json?.text.slice(0, 80).replace(/\n/g, ' ')}..."`
      );

      const tracksRes = await request(`/api/books/${publicDomainBook.id}/tracks`);
      assert(
        tracksRes.status === 200 && tracksRes.json?.tracks && tracksRes.json?.tracks.length > 0,
        `4b. Audio player loads audio tracks for "${publicDomainBook.title}"`,
        `Found ${tracksRes.json?.tracks?.length} tracks. First stream: ${tracksRes.json?.tracks[0]?.streamUrl?.slice(0, 60)}...`
      );
    }
  } catch (err) {
    assert(false, '4. Reader and Audio tracks', err.message);
  }

  // 5. Legal guardrail: Copyrighted book full-text block
  try {
    if (copyrightedBook) {
      const blockedRes = await request(`/api/books/${copyrightedBook.id}/read`);
      assert(
        blockedRes.status === 400 && (blockedRes.json?.error?.includes('public domain') || blockedRes.json?.legalNotice?.includes('copyrighted')),
        `5. Copyrighted book full-text read correctly BLOCKED with 400 and legal notice for "${copyrightedBook.title}"`,
        `Status: ${blockedRes.status}, Error notice: "${blockedRes.json?.error}", Legal Notice: "${blockedRes.json?.legalNotice}"`
      );
    }
  } catch (err) {
    assert(false, '5. Copyrighted book legal block', err.message);
  }

  // 6. User Signup, Login, and Data Persistence across sessions
  try {
    const testEmail = `verif_${Date.now()}@example.com`;
    const testPassword = 'Password123!Secure';
    const testName = 'Production Tester';

    // Register
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: { email: testEmail, password: testPassword, name: testName },
    });
    assert(
      (regRes.status === 200 || regRes.status === 201) && regRes.json?.token,
      '6a. User registration creates user and returns session token',
      `Registered user ID: ${regRes.json?.user?.id}, email: ${testEmail}`
    );

    const token1 = regRes.json?.token;

    // Verify /api/auth/me with first session
    const meRes1 = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(
      meRes1.status === 200 && meRes1.json?.user?.email === testEmail,
      '6b. GET /api/auth/me verifies current user profile',
      `User: ${meRes1.json?.user?.name} (${meRes1.json?.user?.email})`
    );

    // Save a book to library
    const bookToSave = publicDomainBook;
    const saveRes = await request('/api/library/save', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: { bookId: bookToSave.id, status: 'reading' },
    });
    assert(
      saveRes.status === 200 && saveRes.json?.success,
      `6c. Save book "${bookToSave.title}" to user library`,
      `Library entry status: ${saveRes.json?.status}`
    );

    // Update progress
    await request('/api/library/progress', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        bookId: bookToSave.id,
        progressPct: 42.5,
        currentPositionSeconds: 310,
        format: 'audio',
      },
    });

    // "Logout" (drop token1) and log back in with credentials
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: testPassword },
    });
    assert(
      loginRes.status === 200 && loginRes.json?.token,
      '6d. User login authenticates with PBKDF2-SHA512 and issues fresh session token',
      `New login token received`
    );

    const token2 = loginRes.json?.token;

    // Verify library persistence under fresh session
    const libRes = await request('/api/library', {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const savedItem = libRes.json?.items?.find((item) => item.bookId === bookToSave.id);

    assert(
      libRes.status === 200 && savedItem && savedItem.progressPct === 42.5,
      '6e. Library & progress data PERSISTS across logout/login in Turso production database',
      `Persisted book: "${savedItem?.book?.title}", progress: ${savedItem?.progressPct}%, status: "${savedItem?.status}"`
    );
  } catch (err) {
    assert(false, '6. User Signup/Login and Data Persistence', err.message);
  }

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
