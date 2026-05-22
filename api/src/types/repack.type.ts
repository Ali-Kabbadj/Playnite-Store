export interface Repack {
    id: number;
    source_id: number | null;
    title: string | null;
    file_size: string | null;
    upload_date: string | null;
    repack_size: string | null;
    original_size: string | null;
    version: string | null;
    languages: string | null;
    repack_link_source: string | null;
    crack_by: string | null;
    description: string | null;
    description_html: string | null;
    developer: string | null;
    source?: Source;
    uris?: RepackUri[];
}

export interface RepackUri {
    id: number;
    uri: string | null;
    type: string | null;
}

export interface Source {
    id: number;
    title: string | null;
    url: string | null;
    provider?: Provider;
}

export interface Provider {
    id: number;
    name: string | null;
    logo: string | null;
    url: string | null;
}