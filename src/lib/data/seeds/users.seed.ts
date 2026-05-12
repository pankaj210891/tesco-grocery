/**
 * User seed documents — 20 users with pre-assigned ObjectIds.
 *
 * Role assignment:
 *   U01          → admin
 *   U11–U20      → vendor  (mapped to VENDOR_SEEDS ownerId)
 *   U02–U10      → customer
 *
 * All seed accounts use the same default password: Prakash@123
 * Passwords are hashed at seed-run time (see master route).
 */

import { USER_IDS, USER_NAMES, USER_EMAILS, type UserKey } from "./ids";

export interface UserSeed {
  _id: string;
  name: string;
  email: string;
  password: string;      // bcrypt hash — filled by seedUsers() at run time
  role: "admin" | "vendor" | "customer";
  status: "active" | "suspended";
}

export const SEED_PASSWORD = "Prakash@123";

type RawUser = {
  key: UserKey;
  role: "admin" | "vendor" | "customer";
  status?: "active" | "suspended";
};

const RAW: RawUser[] = [
  { key: "U01", role: "admin"    },
  { key: "U02", role: "customer" },
  { key: "U03", role: "customer" },
  { key: "U04", role: "customer" },
  { key: "U05", role: "customer" },
  { key: "U06", role: "customer" },
  { key: "U07", role: "customer" },
  { key: "U08", role: "customer" },
  { key: "U09", role: "customer" },
  { key: "U10", role: "customer" },
  { key: "U11", role: "vendor"   },
  { key: "U12", role: "vendor"   },
  { key: "U13", role: "vendor"   },
  { key: "U14", role: "vendor"   },
  { key: "U15", role: "vendor"   },
  { key: "U16", role: "vendor"   },
  { key: "U17", role: "vendor"   },
  { key: "U18", role: "vendor"   },
  { key: "U19", role: "vendor"   },
  { key: "U20", role: "vendor"   },
];

/** Returns base UserSeed objects with an empty password placeholder. */
export const USER_SEEDS: Omit<UserSeed, "password">[] = RAW.map((r) => ({
  _id:    USER_IDS[r.key],
  name:   USER_NAMES[r.key],
  email:  USER_EMAILS[r.key],
  role:   r.role,
  status: r.status ?? "active",
}));
