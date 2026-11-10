## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Project data

Pages in `src/content/projects/` are point-in-time Red Bricks snapshots, not
live data. They drift. Refresh monthly and in any launch week:
[docs/refreshing-project-data.md](docs/refreshing-project-data.md).

```
python3 scripts/refresh-diff.py live.txt
```

Scope is freehold low-rise only: detached, semis, townhomes. No condos,
stacked towns, life lease or land lease — every project page states there is
no cooling-off period, which is false for a condo buyer.
