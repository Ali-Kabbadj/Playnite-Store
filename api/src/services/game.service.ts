import { GameRepository } from '../repositories/game.repo';
import { getOrSetCache } from '../cache/redis';
import { Game, PaginatedResponse } from '../types';

export class GameService {

    static async getGames(
        page: number, limit: number, searchQuery?: string, hasRepacks?: boolean,
        genre?: string, platform?: string, publisher?: string, source?: string, sort?: string
    ): Promise<PaginatedResponse<Game>> {
        const cacheKey = `games:p${page}:l${limit}:q${searchQuery || ''}:rep${hasRepacks || false}:g${genre || ''}:pl${platform || ''}:pub${publisher || ''}:src${source || ''}:s${sort || ''}`;

        return getOrSetCache(cacheKey, 300, async () => {
            const offset = (page - 1) * limit;
            const { games, total } = await GameRepository.getBaseGames(limit, offset, searchQuery, hasRepacks, genre, platform, publisher, source, sort);

            if (games.length === 0) {
                return { data: [], total, page, limit };
            }

            const gameIds = games.map(g => g.id);

            const [genresData, platformsData, companiesData, repacksData, logosData] = await Promise.all([
                GameRepository.getGenresForGames(gameIds),
                GameRepository.getPlatformsForGames(gameIds),
                GameRepository.getCompaniesForGames(gameIds),
                GameRepository.getRepacksForGames(gameIds),
                GameRepository.getLogosForGames(gameIds)
            ]);

            const genresMap = this.groupBy(genresData, 'game_id', 'genre');
            const platformsMap = this.groupBy(platformsData, 'game_id', 'platform');
            const repacksMap = this.groupBy(repacksData, 'game_id', 'repack');
            const logosMap: Record<string, string> = {};
            logosData.forEach(row => { logosMap[row.game_id] = row.url; });

            const developersMap: Record<string, any[]> = {};
            const publishersMap: Record<string, any[]> = {};

            companiesData.forEach(row => {
                if (row.is_developer) {
                    if (!developersMap[row.game_id]) developersMap[row.game_id] = [];
                    developersMap[row.game_id].push(row.company);
                }
                if (row.is_publisher) {
                    if (!publishersMap[row.game_id]) publishersMap[row.game_id] = [];
                    publishersMap[row.game_id].push(row.company);
                }
            });

            const hydratedGames: Game[] = games.map(game => ({
                ...game,
                genres: genresMap[game.id] || [],
                platforms: platformsMap[game.id] || [],
                developers: developersMap[game.id] || [],
                publishers: publishersMap[game.id] || [],
                repacks: repacksMap[game.id] || [],
                logo_url: logosMap[game.id] || null
            }));

            return {
                data: hydratedGames,
                total,
                page,
                limit
            };
        });
    }

    private static groupBy(array: any[], key: string, extractProp: string) {
        return array.reduce((acc, obj) => {
            const groupKey = obj[key];
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(obj[extractProp]);
            return acc;
        }, {} as Record<string, any[]>);
    }

    static async getGameById(id: string): Promise<Game | null> {
        const cacheKey = `game:${id}`;

        return getOrSetCache(cacheKey, 3600, async () => { // Cache for 1 hour
            const game = await GameRepository.getGameById(id);
            if (!game) return null;

            // Fetch ALL relational data in parallel for blazing speed
            const [
                genresData, platformsData, companiesData, repacksData,
                screenshots, videos, releaseDates, artworks,
                logoUrl
            ] = await Promise.all([
                GameRepository.getGenresForGames([id]),
                GameRepository.getPlatformsForGames([id]),
                GameRepository.getCompaniesForGames([id]),
                GameRepository.getRepacksForGames([id]),
                GameRepository.getScreenshotsForGame(id),
                GameRepository.getVideosForGame(id),
                GameRepository.getReleaseDatesForGame(id),
                GameRepository.getArtworksForGame(id),
                GameRepository.getLogosForGame(id)
            ]);

            const developers = companiesData.filter(c => c.is_developer).map(c => c.company);
            const publishers = companiesData.filter(c => c.is_publisher).map(c => c.company);

            return {
                ...game,
                genres: genresData.map(g => g.genre),
                platforms: platformsData.map(p => p.platform),
                developers,
                publishers,
                repacks: repacksData.map(r => r.repack),
                screenshots,
                videos,
                release_dates: releaseDates,
                artworks,
                logo_url: logoUrl
            };
        });
    }

    static async getGenres() {
        return getOrSetCache('global:genres', 86400, async () => { // Cache for 24h
            return await GameRepository.getAllGenres();
        });
    }

    static async getPlatforms() {
        return getOrSetCache('global:platforms', 86400, async () => { // Cache for 24h
            return await GameRepository.getAllPlatforms();
        });
    }
}