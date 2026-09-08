# Lovable Cloud → Personal Supabase সম্পূর্ণ মাইগ্রেশন প্ল্যান

আপনার এই প্রজেক্টের সব ডেটা (schema, টেবিল ডেটা, auth ইউজার, storage ফাইল, edge functions, triggers) একটি নতুন external/personal Supabase প্রজেক্টে সরানো হবে। নিচে ধাপে ধাপে কী কী হবে তা দেওয়া হলো।

## ১. বর্তমান অবস্থা (যা মাইগ্রেট করতে হবে)

- **টেবিল:** ২৪টি public টেবিল — companies, branches, company_steps, company_installments, company_expenses, company_extra_deals, company_extra_expenses, company_managers, company_shareholders, company_documents, cr_activities, todo_tasks, todo_task_services, user_roles, user_service_assignments, profiles, services, packages, pending_tasks, employees, salary_payments, office_expenses, office_expense_categories, accounts
- **Enum টাইপ:** account_type, app_role, company_type
- **ফাংশন (Security Definer):** has_role, get_user_role, has_expenses_access, has_company_expenses_access, has_office_access, handle_new_user, generate_company_codes, enforce_todo_task_editor_update, set_status_changed_at, set_updated_at
- **Triggers:** সব আপডেট-অ্যাট এবং কোড-জেনারেশন ট্রিগার (14টি)
- **Storage বাকেট:** company-documents (private) — আপলোড করা ফাইলসহ
- **Edge Functions:** admin-create-user, admin-delete-user, admin-update-password, company-detail-api
- **Auth ইউজার:** বর্তমান লগইন ইউজার ও তাদের রোল/প্রোফাইল
- **RLS পলিসি + GRANT:** প্রতিটি টেবিলের জন্য

## ২. মাইগ্রেশন ধাপ

### ধাপ A — ডেটাবেস ব্যাকআপ ডাউনলোড (আপনি করবেন)
1. Lovable এডিটরে **More → Cloud → Database → Backups** অথবা **Cloud → Advanced settings → Export data** যান।
2. সম্পূর্ণ ডেটাবেস ব্যাকআপ (SQL/PG dump) ডাউনলোড করুন।
3. ফাইলটি এই চ্যাটে সংযুক্ত করুন অথবা নির্দেশিত হলে নিরাপদ স্থানে রাখুন।

### ধাপ B — নতুন Supabase প্রজেক্ট তৈরি (আপনি করবেন)
1. supabase.com-এ নতুন প্রজেক্ট খুলুন, region ও পাসওয়ার্ড সেট করুন।
2. প্রজেক্ট ready হলে আমাকে জানান — আমি SQL কমান্ড দিয়ে রিস্টোর করতে সাহায্য করব।

### ধাপ C — Schema + Data রিস্টোর (আমি গাইড করব)
- Enum ও টেবিল তৈরির সম্পূর্ণ SQL (GRANT + RLS + পলিসি সহ) প্রস্তুত করব।
- ডেটা ইনসার্ট ক্রম (foreign-key অনুযায়ী): branches → companies → services/packages → বাকি সব → todo_tasks → todo_task_services।
- ট্রিগার ও ফাংশন রিক্রিয়েট করব।

### ধাপ D — Auth ইউজার মাইগ্রেশন
- Lovable-এর `auth.users` সরাসরি ডাম্প করা যায় না (Supabase-managed)।
- প্রতিটি ইউজার নতুন প্রজেক্টে পাসওয়ার্ড রিসেট লিঙ্ক দিয়ে রিক্রিয়েট করবে, একই UUID সহ।
- `profiles`, `user_roles`, `user_service_assignments` ডেটা ঐ UUID দিয়ে ইম্পোর্ট হবে।

### ধাপ E — Storage ফাইল মাইগ্রেশন
- `company-documents` বাকেট নতুন প্রজেক্টে তৈরি করব।
- প্রতিটি ফাইল Supabase Storage API দিয়ে ডাউনলোড ও রি-আপলোড করব, `file_path` ঠিক রেখে।
- `company_documents` টেবিলের রেকর্ড অপরিবর্তিত থাকবে।

### ধাপ F — Edge Functions ডিপ্লয়
- `supabase/functions/` ফোল্ডারের ৪টি ফাংশন নতুন প্রজেক্টে ডিপ্লয় করব।
- `company-detail-api`-এর `verify_jwt=false` কনফিগ ঠিক রাখব।
- প্রয়োজনীয় সিক্রেট যোগ করব।

### ধাপ G — অ্যাপ কনফিগ পরিবর্তন
- নতুন Supabase URL ও anon key অ্যাপে বসাব (Lovable-এর `.env` বা external কানেকশন)।
- লক্ষ্য রাখব: Lovable Cloud থেকে external Supabase-এ "disconnect" সম্ভব নয়; তাই মাইগ্রেশনের পর অ্যাপ চালাতে নতুন external প্রজেক্টের কানেকশন ব্যবহার করতে হবে।

## ৩. বিশেষ সতর্কতা
- `generate_company_codes` ট্রিগার direct execution revoked — নতুন প্রজেক্টেও পাবলিক রোল থেকে revoke রাখব।
- প্রতিটি টেবিলে GRANT অনুপস্থিত থাকলে Data API কাজ করবে না — মাইগ্রেশন SQL-এ GRANT থাকবেই।
- Auth ইউজারের পাসওয়ার্ড ব্যাকআপে থাকে না — রিসেট লিঙ্ক দিয়ে রিক্রিয়েট করতে হবে।

## ৪. আমার পরবর্তী কাজ (অনুমোদন পেলে)
- সম্পূর্ণ schema + RLS + GRANT + ট্রিগার + ফাংশন SQL একসাথে তৈরি করা।
- ধাপ ধাপে ডেটা ইম্পোর্ট স্ক্রিপ্ট তৈরি করা।
- স্টোরেজ ও এজ ফাংশন মাইগ্রেশন গাইড করা।

প্ল্যান অনুমোদন করলে আমি SQL মাইগ্রেশন ফাইল তৈরি শুরু করব।
