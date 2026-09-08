import fs from "node:fs/promises";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.STORAGE_BUCKET || "contracts";

const localStorageDir = path.resolve(process.cwd(), ".storage", bucketName);

let supabaseAdmin: SupabaseClient | null = null;

if (rawSupabaseUrl && supabaseServiceRoleKey) {
  try {
    const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.warn("Could not initialize Supabase client:", err);
  }
}

export { supabaseAdmin };

export const storage = {
  async uploadFile(filePath: string, fileBuffer: Buffer, contentType: string) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType,
            upsert: false,
          });

        if (!error && data) {
          return data;
        }
        console.warn(`Supabase upload failed (${error?.message}). Falling back to local storage.`);
      } catch (uploadErr) {
        console.warn("Supabase storage unreachable. Falling back to local disk storage:", uploadErr);
      }
    }

    // Local Disk Fallback
    const localTarget = path.resolve(process.cwd(), ".storage", filePath);
    await fs.mkdir(path.dirname(localTarget), { recursive: true });
    await fs.writeFile(localTarget, fileBuffer);
    return { path: filePath, id: filePath, fullPath: localTarget };
  },

  async getSignedUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(bucketName)
          .createSignedUrl(filePath, expiresInSeconds);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch {
        // fall through to local
      }
    }

    // For local files, return a local file reference descriptor
    return `/api/storage/local?path=${encodeURIComponent(filePath)}`;
  },

  async deleteFile(filePath: string) {
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.storage.from(bucketName).remove([filePath]);
      } catch {
        // ignore
      }
    }

    const localTarget = path.resolve(process.cwd(), ".storage", filePath);
    try {
      await fs.unlink(localTarget);
    } catch {
      // ignore if file doesn't exist
    }
    return { path: filePath };
  },
};
