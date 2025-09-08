# ProfileScreen Legal Integration Example

## Add Legal Documents Section to ProfileScreen

Here's how to integrate the legal documents into your existing ProfileScreen:

### 1. Add Imports

```typescript
// Add these imports to the top of ProfileScreen.tsx
import { LegalModal } from "../components/legal";
```

### 2. Add State Variables

```typescript
// Add these state variables in the ProfileScreen component
const [showLegalModal, setShowLegalModal] = useState(false);
const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');
```

### 3. Add Legal Documents Section

Add this section after your existing settings options and before the App Info section:

```typescript
{/* Legal Documents Section */}
<View className="bg-surface-800 rounded-lg mb-6">
  <View className="p-5 border-b border-surface-700">
    <Text className="text-text-primary font-semibold mb-3">Legal</Text>
  </View>
  
  <Pressable
    onPress={() => {
      setLegalModalTab('privacy');
      setShowLegalModal(true);
    }}
    className="p-5 border-b border-surface-700"
  >
    <View className="flex-row items-center">
      <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
      <Text className="text-text-primary font-medium ml-3">Privacy Policy</Text>
      <View className="flex-1" />
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </View>
  </Pressable>
  
  <Pressable
    onPress={() => {
      setLegalModalTab('terms');
      setShowLegalModal(true);
    }}
    className="p-5"
  >
    <View className="flex-row items-center">
      <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
      <Text className="text-text-primary font-medium ml-3">Terms of Service</Text>
      <View className="flex-1" />
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </View>
  </Pressable>
</View>
```

### 4. Add Legal Modal Component

Add this before the closing `</SafeAreaView>` tag:

```typescript
{/* Legal Modal */}
<LegalModal
  visible={showLegalModal}
  onClose={() => setShowLegalModal(false)}
  initialTab={legalModalTab}
/>
```

### Complete Integration Example

Here's the complete section to add to your ProfileScreen:

```typescript
// After your existing settings sections and before App Info:

{/* Legal Documents Section */}
<View className="bg-surface-800 rounded-lg mb-6">
  <View className="p-5 border-b border-surface-700">
    <Text className="text-text-primary font-semibold mb-3">Legal</Text>
  </View>
  
  <Pressable
    onPress={() => {
      setLegalModalTab('privacy');
      setShowLegalModal(true);
    }}
    className="p-5 border-b border-surface-700"
  >
    <View className="flex-row items-center">
      <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
      <Text className="text-text-primary font-medium ml-3">Privacy Policy</Text>
      <View className="flex-1" />
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </View>
  </Pressable>
  
  <Pressable
    onPress={() => {
      setLegalModalTab('terms');
      setShowLegalModal(true);
    }}
    className="p-5"
  >
    <View className="flex-row items-center">
      <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
      <Text className="text-text-primary font-medium ml-3">Terms of Service</Text>
      <View className="flex-1" />
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </View>
  </Pressable>
</View>

// And before the closing </SafeAreaView>:

{/* Legal Modal */}
<LegalModal
  visible={showLegalModal}
  onClose={() => setShowLegalModal(false)}
  initialTab={legalModalTab}
/>
```

This integration provides:
- Easy access to legal documents from settings
- Consistent UI with your existing design
- Proper modal presentation
- Navigation between Privacy Policy and Terms of Service
- Mobile-optimized viewing experience
