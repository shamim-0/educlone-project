# Company Profile Agreement System — বাস্তবায়ন পরিকল্পনা

## লক্ষ্য
Company Profile-এ একটি নতুন **Agreements** section থাকবে। Diagram অনুযায়ী মোট ১৬টি agreement template থাকবে:

- Service License Agreement: ৮টি
- Trading License Agreement: ৮টি
- প্রতিটি license type-এর অধীনে:
  - International Investor: Legacy, Executive, Business, Starter
  - KSA Resident: Legacy, Executive, Business, Starter

User agreement তৈরির সময় license type, investor type এবং package manually নির্বাচন করবে।

## ব্যবহারকারীর ধাপ
1. Company Profile থেকে **Agreements** section খুলবে।
2. **Create Agreement** চাপবে।
3. License type, investor type এবং package নির্বাচন করবে।
4. নির্বাচনের ভিত্তিতে ১৬টি HTML template-এর সঠিক template খুলবে।
5. Company Profile থেকে company name, client name, passport/Iqama, branch, package, deal amount এবং প্রযোজ্য অন্যান্য তথ্য auto-fill হবে।
6. HTML-এ আগে থেকে editable রাখা field/section সরাসরি edit করা যাবে।
7. Preview দেখে Print বা PDF download করা যাবে।
8. **Save Final Version** করলে সেই সময়ের সম্পূর্ণ agreement snapshot company-এর সঙ্গে স্থায়ীভাবে সংরক্ষিত হবে।

## Company Profile UI
- বর্তমান Company Profile-এর পাশে/নিচে একটি পূর্ণ-প্রস্থ **Agreements** section যোগ হবে, যাতে document preview পড়ার মতো যথেষ্ট বড় থাকে।
- Saved agreement list-এ থাকবে:
  - Agreement type
  - Investor type
  - Package
  - Created date
  - Created by
  - Status: Draft / Final
  - View, Edit Draft, Print/PDF এবং Delete action (permission অনুযায়ী)
- Final agreement খুললে আগের saved content-ই দেখাবে; পরবর্তীতে company/profile/package বদলালেও final copy পরিবর্তিত হবে না।

## ১৬টি HTML Template সংযুক্তকরণ
- আপনার ZIP থেকে ১৬টি HTML file ও তাদের local CSS/image/font asset আলাদা template হিসেবে যোগ করা হবে।
- প্রতিটি file-কে diagram-এর একটি নির্দিষ্ট combination-এর সঙ্গে map করা হবে।
- HTML-এর editable অংশ অক্ষুণ্ণ রাখা হবে।
- Unsafe script সরিয়ে template নিরাপদভাবে preview করা হবে।
- Existing design, pagination, print size এবং page breaks যথাসম্ভব অপরিবর্তিত রাখা হবে।

## Auto-fill ও Editing
- Template placeholder-গুলোর জন্য একটি common mapping থাকবে, যেমন:
  - Company এবং client details
  - Passport/Iqama
  - Branch
  - Package name, price এবং duration
  - Agreement date
  - License ও investor selection
- Missing তথ্য থাকলে blank/editable থাকবে; ভুল placeholder silently বসানো হবে না।
- User-এর edit আলাদা draft data হিসেবে save হবে, মূল ১৬টি template বদলাবে না।

## সংরক্ষণ ও অনুমতি
- প্রতিটি company-এর একাধিক agreement রাখা যাবে।
- Draft update করা যাবে; Final version immutable snapshot হিসেবে রাখা হবে। প্রয়োজন হলে সেটি duplicate করে নতুন draft বানানো যাবে।
- Authenticated authorized users agreement দেখতে পারবে।
- Company edit permission থাকা user draft তৈরি/edit করতে পারবে; destructive/final-management action বর্তমান role rules অনুসরণ করবে।
- Created by, updated by এবং timestamps রাখা হবে audit-এর জন্য।

## Print ও PDF
- Agreement-এর original A4 layout, page count, header/footer এবং page break বজায় রেখে print view থাকবে।
- Browser Print থেকে PDF save এবং একটি পরিষ্কার **Download PDF** action থাকবে।
- PDF-তে editor controls বা app navigation থাকবে না।

## Technical details
- Agreement records-এর জন্য secured database table তৈরি হবে, যেখানে template key, selections, draft HTML/content, final HTML snapshot, status এবং audit fields থাকবে।
- নতুন table-এ explicit grants এবং row-level access rules একই migration-এ যোগ হবে।
- Agreement template registry ১৬টি file-এর mapping centrally পরিচালনা করবে।
- Template HTML isolated preview-তে render হবে, যাতে agreement CSS Company Profile-এর design নষ্ট না করে।
- Existing `packages` relation থেকে package name, price ও `duration_months` নেওয়া হবে।
- Existing document category **Final quotation and agreement** অপরিবর্তিত থাকবে; generated agreements নতুন Agreements section-এ পরিচালিত হবে।

## যাচাই
- ১৬টি combination প্রত্যেকটি সঠিক template খোলে কিনা পরীক্ষা।
- Auto-fill, editable fields, draft reopen এবং final snapshot পরীক্ষা।
- A4 print/PDF-এর প্রতিটি page-এ clipping, overflow, missing font/image এবং page-break পরীক্ষা।
- Admin/editor/view-only permission পরীক্ষা।
- Desktop ও mobile-এ Agreement list এবং viewer ব্যবহারযোগ্য কিনা পরীক্ষা।

## বাস্তবায়নের আগে প্রয়োজন
- ১৬টি HTML file এবং ব্যবহৃত CSS, font, image-সহ একটি ZIP upload করতে হবে।
- File name বা folder structure থেকে mapping স্পষ্ট না হলে ZIP পর্যালোচনা করে একটি mapping তালিকা তৈরি করা হবে; তারপর implementation শুরু হবে।
