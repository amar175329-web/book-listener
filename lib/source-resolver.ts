import { Book, AvailabilityMatrix } from './types';

export function resolveAvailability(book: Book): AvailabilityMatrix {
  const flags = book.sourceFlags;
  const encodedSpotifyQuery = encodeURIComponent(book.spotifyQuery || `${book.title} ${book.author}`);

  const spotify = {
    available: flags.hasSpotify,
    query: book.spotifyQuery || `${book.title} ${book.author}`,
    webUrl: `https://open.spotify.com/search/${encodedSpotifyQuery}`,
    appUri: `spotify:search:${encodedSpotifyQuery}`,
    label: flags.hasSpotify ? 'Open on Spotify' : 'Unavailable on Spotify'
  };

  const freeRead = {
    available: flags.hasGutenberg,
    source: book.standardEbooksSlug 
      ? 'Standard Ebooks (CC0)' 
      : (book.gutenbergId ? 'Project Gutenberg (Public Domain)' : undefined),
    gutenbergId: book.gutenbergId,
    standardEbooksSlug: book.standardEbooksSlug,
    readUrl: book.gutenbergId ? `/api/books/${book.id}/read` : undefined,
    epubUrl: book.gutenbergId ? `https://www.gutenberg.org/ebooks/${book.gutenbergId}.epub3.images` : undefined,
    label: flags.hasGutenberg ? 'Read Free in App' : 'No Free Full-Text Available'
  };

  const freeListen = {
    available: flags.hasLibriVox,
    source: flags.hasLibriVox ? 'LibriVox & Internet Archive' : undefined,
    identifier: book.librivoxIdentifier,
    streamUrl: book.librivoxIdentifier ? `/api/books/${book.id}/tracks` : undefined,
    label: flags.hasLibriVox ? 'Listen Free (LibriVox)' : 'No Public Domain Audio'
  };

  const summary = {
    available: flags.hasSummary,
    hasTtsAudio: true, // Supported via client Web Speech or audio track
    label: 'Book Listener Original Summary',
    sublabel: 'Short transformative key lessons & takeaways. Not the full book.'
  };

  const attributions: string[] = [];
  if (book.metadataSource === 'google_books' || book.googleBooksId) {
    attributions.push('Book metadata provided by Google Books under required attribution terms.');
  }
  if (book.metadataSource === 'open_library' || book.openLibraryKey) {
    attributions.push('Book metadata and covers courtesy of Open Library.');
  }
  if (flags.hasGutenberg) {
    attributions.push('Public-domain full text provided by Project Gutenberg (US copyright expired).');
  }
  if (flags.hasLibriVox) {
    attributions.push('Audiobook recording provided by LibriVox volunteers and hosted by Internet Archive (Public Domain).');
  }
  if (flags.hasSummary) {
    attributions.push('Book Listener Original Summary — Transformative synthesis & key takeaways. Not the full book.');
  }

  return {
    spotify,
    freeRead,
    freeListen,
    summary,
    attributions
  };
}
