import { Text, View, ScrollView, Pressable } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import { useAppColorScheme } from "@/context/ThemeContext";
import { useTranslation } from "@/Translation/TranslationContext";
import { getTheme } from "@/constants/theme";
import { RootState } from "@/store";
import { toggleCalendarTask } from "@/slice";
import { sortChecklistEvents } from "@/utils/calendarChecklist";

export default function PriorityChecklist() {
  const theme = getTheme(useAppColorScheme());
  const { language, t } = useTranslation();
  const dispatch = useDispatch();
  const events = useSelector((state: RootState) => state.app.events);
  const completedIds = useSelector((state: RootState) => state.app.completedCalendarTasks);
  const completed = new Set(completedIds ?? []);
  const tasks = sortChecklistEvents(events, completed);
  return <View style={{ flex: 1, minHeight: 0, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 16, overflow: "hidden" }}>
    <View style={{ padding: 16, gap: 6 }}>
      <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: "600" }}>{t("priorityChecklist")}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>{t("priorityChecklistHelp")}</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
      {tasks.length === 0 && <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>{t("priorityChecklistEmpty")}</Text>}
      {tasks.map(task => {
        const checked = completed.has(task.id);
        const deadline = new Date(...task.date).toLocaleDateString(language, { month: "short", day: "numeric", year: "numeric" });
        return <Pressable key={task.id} accessibilityRole="checkbox" accessibilityState={{ checked }}
          accessibilityLabel={`${task.name}, ${t("checklistDeadline")}: ${deadline}`}
          onPress={() => dispatch(toggleCalendarTask(task.id))}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, backgroundColor: pressed ? theme.backgroundSelected : "transparent" })}>
          <View style={{ width: 20, height: 20, marginTop: 2, borderRadius: 5, borderWidth: 1, borderColor: checked ? theme.backgroundAccent : theme.textSecondary, backgroundColor: checked ? theme.backgroundAccent : "transparent", alignItems: "center", justifyContent: "center" }}>
            {checked && <FontAwesomeFreeSolid name="check" size={12} color={theme.textOnAccent} />}
          </View>
          <Text style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 22, color: checked ? theme.textSecondary : theme.text, textDecorationLine: checked ? "line-through" : "none" }}>{task.name}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 22, fontWeight: "400", maxWidth: "35%", textAlign: "right" }}>{deadline}</Text>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
