export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeCache } = await import('./lib/init-cache');
    await initializeCache();
  }
}

