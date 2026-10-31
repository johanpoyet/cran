// Replaces fetch for one test: an API answer, or an unreachable server.

export function mockFetchResponse(status: number, body: unknown) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

export function mockFetchFailure() {
  return jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
}
