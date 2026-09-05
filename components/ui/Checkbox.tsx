import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useAppTheme } from "@/lib/theme";

type CheckboxProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
};

export function Checkbox({ checked, label, onPress }: CheckboxProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={onPress}
      style={styles.wrapper}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked
              ? theme.colors.primary
              : theme.colors.surfaceElevated,
            borderColor: checked ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        {checked ? <Text color={theme.colors.white}>✓</Text> : null}
      </View>
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  box: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
});
