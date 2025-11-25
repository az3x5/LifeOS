# Habits Module - UI/UX Showcase

## 🎨 Visual Design System

### Color Palette
```
Primary Background:    #0f172a (slate-900)
Secondary Background:  #1e293b (slate-800)
Tertiary Background:   #334155 (slate-700)
Accent Color:          #6366f1 (indigo-500)
Success:               #10b981 (emerald-500)
Warning:               #f59e0b (amber-500)
Text Primary:          #f1f5f9 (slate-100)
Text Secondary:        #cbd5e1 (slate-400)
```

### Typography
- **Headings**: Bold, clear hierarchy
- **Body**: Clean, readable sans-serif
- **Badges**: Small, medium weight
- **Descriptions**: Muted secondary color

## 📐 Layout Specifications

### Desktop (1024px+)
```
┌─────────────────────────────────────────────────┐
│ Sidebar (320px)  │  Main Content (flex)         │
│                  │                              │
│ • Filters        │  Header Bar                  │
│ • Search         │  ┌──────────────────────┐   │
│ • Folders        │  │ Habits │ Grid │ List │   │
│ • Habits         │  └──────────────────────┘   │
│                  │                              │
│                  │  ┌─────┐ ┌─────┐ ┌─────┐   │
│                  │  │Card1│ │Card2│ │Card3│   │
│                  │  └─────┘ └─────┘ └─────┘   │
│                  │  ┌─────┐ ┌─────┐ ┌─────┐   │
│                  │  │Card4│ │Card5│ │Card6│   │
│                  │  └─────┘ └─────┘ └─────┘   │
└─────────────────────────────────────────────────┘
```

### Tablet (640-1024px)
```
┌──────────────────────────────┐
│ ☰ │ Habits │ Grid │ List     │
├──────────────────────────────┤
│ ┌──────────┐ ┌──────────┐   │
│ │  Card 1  │ │  Card 2  │   │
│ └──────────┘ └──────────┘   │
│ ┌──────────┐ ┌──────────┐   │
│ │  Card 3  │ │  Card 4  │   │
│ └──────────┘ └──────────┘   │
└──────────────────────────────┘
```

### Mobile (<640px)
```
┌──────────────────┐
│ ☰ │ Habits │ ⊞ ⊟ │
├──────────────────┤
│ ┌──────────────┐ │
│ │   Card 1     │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │   Card 2     │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │   Card 3     │ │
│ └──────────────┘ │
│                  │
│              ┌─┐ │
│              │+│ │ ← FAB
│              └─┘ │
└──────────────────┘
```

## 🎯 Habit Card Design

### Grid View Card
```
┌─────────────────────────────┐
│ Habit Name          ✓ ⋮     │
│ Category                    │
│                             │
│ Description preview...      │
│                             │
│ ▓▓▓▓░░░░░░░░░░░░░░░░░░░░░ │ Progress
│                             │
│ 🟢 Active  🔥 5  ✓ Done    │
└─────────────────────────────┘
```

### List View Item
```
┌─────────────────────────────────────────┐
│ ▓ │ Habit Name        🔥 5  │ ✓ ⋮      │
│   │ Description preview...              │
└─────────────────────────────────────────┘
```

## 🎬 Animations & Interactions

### Card Hover
- Border color: tertiary → accent
- Shadow: md → lg
- Scale: 1.0 → 1.02 (subtle)
- Duration: 300ms

### Button Hover
- Background: tertiary → accent
- Scale: 1.0 → 1.1
- Duration: 200ms

### Progress Bar
- Animation: smooth fill
- Duration: 500ms
- Gradient: indigo → accent (active)
- Gradient: green → emerald (completed)

### FAB Visibility
- Appears when scrolling up
- Disappears when scrolling down
- Smooth fade transition
- Mobile only

## 🏷️ Badge Styles

### Status Badges
```
Active:    🟢 bg-green-500/20 text-green-400
Paused:    ⚫ bg-gray-500/20 text-gray-400
Completed: ✓ bg-green-500/20 text-green-400
```

### Streak Badge
```
🔥 5 day streak
bg-orange-500/20 text-orange-400
```

## 🔘 Button Styles

### Primary Button
```
Background: bg-accent
Text: text-white
Padding: px-6 py-3
Rounded: rounded-lg
Hover: bg-accent/90
```

### Icon Button
```
Background: bg-tertiary
Padding: p-2
Rounded: rounded-lg
Hover: bg-accent/20
```

### Context Menu
```
Background: bg-tertiary
Border: border-primary
Rounded: rounded-lg
Shadow: shadow-xl
Items: px-4 py-2.5
```

## 📊 Responsive Spacing

```
Mobile:   p-4, gap-4
Tablet:   p-5, gap-4 md:gap-5
Desktop:  p-6, gap-5
```

## ✨ Filter Navigation

```
┌─────────────────────────────┐
│ 🔥 All Habits              │
│ ▶ Active                    │
│ ⏸ Paused                    │
│ ✓ Today                     │
│ ✔ Completed                 │
└─────────────────────────────┘
```

## 🎪 Empty State

```
┌─────────────────────────────┐
│                             │
│          📥                 │
│                             │
│   No habits yet             │
│   Start building better     │
│   habits today              │
│                             │
│   [+ Create Your First]     │
│                             │
└─────────────────────────────┘
```

## 🚀 Performance Metrics

- **Build Time**: 1.92s
- **Bundle Size**: 674.85 kB (main)
- **TypeScript Errors**: 0
- **Animations**: 60fps
- **Mobile Optimized**: ✓
- **Accessibility**: ✓

## 📱 Mobile-First Approach

1. **Single Column** - Stacked layout
2. **Touch Friendly** - 44px+ buttons
3. **FAB** - Quick access to create
4. **Collapsible Sidebar** - More space
5. **Smart Visibility** - FAB hides on scroll
6. **Optimized Spacing** - Proper padding

## 🎯 User Experience Flow

```
1. Open Habits Module
   ↓
2. View Habits (Grid/List)
   ↓
3. Filter/Search Habits
   ↓
4. Click Habit Card
   ↓
5. Quick Actions:
   - Toggle Completion ✓
   - Edit ✏️
   - Pause ⏸
   - Delete 🗑️
   ↓
6. Create New Habit
   - Click FAB (mobile)
   - Click Header Button (desktop)
   - Click Sidebar Button
```

## 🔐 Accessibility Features

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigation support
- Color contrast compliance
- Touch-friendly button sizes
- Clear focus states
- Descriptive icon titles

