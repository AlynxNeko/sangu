## Packages
@supabase/supabase-js | Direct Supabase integration for Auth/DB/Storage
recharts | Data visualization for financial charts
framer-motion | Smooth page transitions and complex animations
date-fns | Date formatting and manipulation
lucide-react | Beautiful icons
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind CSS classes
react-dropzone | File upload drag and drop handling

## Notes
Supabase client initialized with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
Authentication handled via Supabase Auth.
Database access via Supabase Client (not internal API).
File uploads to 'transaction-attachments' bucket.
OCR webhook at VITE_N8N_OCR_WEBHOOK.
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
}
