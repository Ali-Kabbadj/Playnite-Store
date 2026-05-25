# GamesNexus (Playnite-Store ... still thinking of a name lol)

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg) ![Playnite](https://img.shields.io/badge/Playnite-Extension-orange.svg)

![GamesNexus Playnite Integration](./docs/assets/playnite-extension-preview.png)

## Repository Structure

| Component              | Path                           | Description                                                  |
| :--------------------- | :----------------------------- | :----------------------------------------------------------- |
| **Playnite Extension** | `/playnite/playnite-extension` | The C# WPF Add-on that users install in Playnite.            |
| **Public API**         | `/api`                         | The read-only API serving data to the Playnite extension.    |
| **Admin Panel UI**     | `/db/admin_panel/frontend`     | The dashboard for community moderators.                      |
| **Admin API**          | `/db/admin_panel/backend`      | The read/write API for managing the database.                |
| **ETL Scripts**        | `/db/scripts`                  | Python scripts for scraping, normalizing, and auditing data. |

1. **Architecture & Master Plan:** Read [`docs/ARCHITECTURE_AND_PIPELINE.md`](./docs/ARCHITECTURE_AND_PIPELINE.md) to understand how the pieces fit together.
2. **Backend API:** Check out the [API Setup Guide (`/api/README.md`)](./api/README.md).
3. **Admin Panel:** Head over to the [Admin Panel Guide (`/admin_panel/README.md`)](./admin_panel/README.md).
4. **Playnite Extension:** Read the [Extension Dev Guide (`/playnite/playnite-extension/README.md`)](./playnite/playnite-extension/README.md).
5. **Python ETL Scripts:** Read the [Database Scripts Guide (`/db/scripts/README.md`)](./db/scripts/README.md).

## Community & Data Moderation

GamesNexus hopes to rely on community curation to keep game metadata and repack links clean and organized. If you want to help us sort orphan repacks, assign genres, or submit new repack sources, check out our **[Community Pipeline Guide](./docs/ARCHITECTURE_AND_PIPELINE.md#community-data-pipeline)**.

![Admin Panel Dashboard](./docs/assets/admin-panel-dashboard.png)

### Note : Local Database Setup (Recreation)

To recreate the `playnitedb` database locally using the repository dump, follow these steps (insure you have postgress installed):

1. **Install Git LFS** (if not already installed) and pull the latest changes to ensure you have the actual dump file rather than the LFS pointer file:

   ```bash
   git lfs pull
   ```

2. **Navigate to the database directory**:

   ```bash
   cd db
   ```

3. **Create a fresh, empty PostgreSQL database**:

   ```bash
   createdb -U postgres playnitedb
   ```

4. **Restore the database schema and data** from the dump file:

   ```bash
   pg_restore -U postgres -d playnitedb db/playnitedb.dump
   ```
