# Notion-like Subjects Page Customization

I've made the subjects page much more customizable, similar to Notion. Here's what's been added:

## ✨ New Features

### 1. **Custom Icons**
- Each subject can now have a custom icon from 70+ Lucide icons
- Click the `···` menu on any subject → "Change Icon"
- Browse or search for the perfect icon

### 2. **Custom Colors**
- Choose from 18 Notion-style colors for each subject
- Colors range from Red, Orange, Amber to Purple, Pink, and more
- Click the `···` menu → "Change Color"

### 3. **Custom Titles**
- Rename subjects to whatever you prefer
- E.g., rename "Mathematics" to "Math" or "Calculus"

### 4. **Cover Images**
- Add gradient covers to subjects (like Notion page covers)
- 10 beautiful gradient options: Sunset, Ocean, Forest, Berry, Sky, Twilight, Fire, Midnight, Gold

### 5. **Full Customization Sheet**
- Click "Customise" in the subject menu to open a full customization panel
- Preview changes in real-time
- Reset to defaults anytime

## 📁 Files Created/Modified

### New Components:
- `src/components/IconPicker.tsx` - Icon selection dialog
- `src/components/ColorPicker.tsx` - Color selection dialog  
- `src/components/SubjectCustomizationSheet.tsx` - Full customization panel

### Updated Files:
- `src/views/SubjectsOverview.tsx` - Added customization UI
- `src/utils/subjectStore.ts` - Added custom subject storage methods
- `supabase/migrations/add_custom_subjects.sql` - Database migration

## 🗄️ Database Setup

Run this migration in your Supabase SQL Editor:

```sql
-- The migration file is at: supabase/migrations/add_custom_subjects.sql
```

This creates a `custom_subjects` table that stores:
- `custom_icon` - The icon name (e.g., "Brain", "Rocket")
- `custom_color` - Color ID (e.g., "blue", "red")
- `custom_cover` - Cover gradient ID (e.g., "sunset", "ocean")
- `custom_title` - Custom display name

## 🎨 Color Palette

The following colors are available:
- **Default** - Muted gray
- **Red, Orange, Amber, Yellow**
- **Lime, Green, Emerald, Teal**
- **Cyan, Sky, Blue, Indigo**
- **Violet, Purple, Fuchsia, Pink, Rose**

## 🎯 How to Use

### List View:
1. Hover over any subject
2. Click the `···` menu that appears
3. Choose "Customise", "Change Icon", or "Change Color"

### Grid View:
1. Hover over any subject card
2. Click the `···` menu in the top-right
3. Make your changes

### Customization Panel:
- **Custom Title** - Give the subject a custom name
- **Icon** - Click to browse and select an icon
- **Color** - Click to choose from the color palette
- **Cover** - Select from gradient covers
- **Reset to Default** - Clear all customizations

## 💾 Storage

All customizations are stored in Supabase (`custom_subjects` table), so they sync across devices and are persisted permanently.

## 🔧 Technical Details

- Uses TypeScript for type safety
- Fully responsive design
- Smooth animations with Framer Motion
- Follows existing code conventions
- No breaking changes to existing functionality

---

**Next Steps:**
1. Run the database migration in Supabase
2. Test the customization features
3. Enjoy your personalized subjects page! 🎉
