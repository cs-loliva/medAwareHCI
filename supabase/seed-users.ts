import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_USER_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !demoPassword) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEMO_USER_PASSWORD."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const demoUsers = [
  { email: "civilian@medaware.demo", fullName: "Alex Civilian" },
  { email: "caregiver@medaware.demo", fullName: "Carla Caregiver" },
  { email: "nurse@medaware.demo", fullName: "Nina Nurse" },
  { email: "doctor@medaware.demo", fullName: "Dr. Diego Santos" },
  { email: "pharmacist@medaware.demo", fullName: "Pat Pharmacist" },
  { email: "admin@medaware.demo", fullName: "Ada Admin" },
];

async function findUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email === email);
}

async function main() {
  console.log("Creating or updating MedAware demo users...");

  for (const user of demoUsers) {
    const existingUser = await findUserByEmail(user.email);

    if (existingUser) {
      const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
        },
      });

      if (error) {
        console.error(`Failed to update ${user.email}:`, error.message);
        process.exitCode = 1;
        continue;
      }

      console.log(`Updated existing user: ${user.email}`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
      },
    });

    if (error) {
      console.error(`Failed to create ${user.email}:`, error.message);
      process.exitCode = 1;
      continue;
    }

    console.log(`Created ${user.email} (${data.user?.id})`);
  }

  console.log("Done. Now run supabase/seed.sql in the Supabase SQL Editor.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});