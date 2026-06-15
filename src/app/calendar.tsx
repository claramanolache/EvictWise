import Layout from "@/components/Layout";
import { getTheme } from "@/constants/theme";
import { RootState } from "@/store";
import { CalendarEvent, CrudeDate } from "@/types";
import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import { useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  SafeAreaView,
  useColorScheme,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { useSelector } from "react-redux";

const menuHeight = 400;

export default function Calendar() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const scrollViewRef = useRef<any>(null);
  const [scrollViewHeight, setScrollViewHeight] = useState<number | null>(null);

  // layout tracking
  const monthYsRef = useRef<Record<number, number>>({});
  const dayLayoutsRef = useRef<Record<string, { y: number; height: number }>>(
    {},
  );
  const initialScrolledRef = useRef(false);

  const today = new Date();
  const court = new Date();
  const payment = new Date(court.getTime() + 5 * 24 * 60 * 60 * 1e3);
  const house = new Date(payment.getTime() + 5 * 24 * 60 * 60 * 1e3);

  const [selectedDate, setSelectedDate] = useState<CrudeDate | null>(null);
  const lastSelectedDateRef = useRef<CrudeDate>([0, 0, 0]);
  lastSelectedDateRef.current = selectedDate || lastSelectedDateRef.current;
  const lastSelectedDate = lastSelectedDateRef.current;
  const menuTranslate = useRef(
    new Animated.Value(selectedDate ? 0 : menuHeight),
  ).current;
  useEffect(() => {
    Animated.timing(menuTranslate, {
      toValue: selectedDate ? 0 : menuHeight,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [selectedDate, menuTranslate]);

  const events = useSelector((state: RootState) => state.app.events);

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: CrudeDate, date2: CrudeDate) => {
    return (
      date1[0] === date2[0] && date1[1] === date2[1] && date1[2] === date2[2]
    );
  };

  const months = [];
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const dayCellStyle = {
    position: "relative",
    width: "14.28%", // Perfect 1/7th split for the days of the week
    aspectRatio: 1, // Keeps cells perfectly square
    padding: 2, // Added padding to accommodate event indicators
  } as const;

  // Helper function to get color based on type
  const getColor = (type: CalendarEvent["type"] | string) =>
    ({
      court: theme.court,
      payment: theme.payment,
      house: theme.house,
    })[type] ?? theme.textSecondary;

  for (let i = -8; i < 8; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthName = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    const daysInMonth = new Date(year, date.getMonth() + 1, 0).getDate();
    const startingDay = new Date(year, date.getMonth(), 1).getDay();

    const dayCells = [];

    // 1. Add empty padding cells for the start of the month
    for (let d = 0; d < startingDay; d++) {
      dayCells.push(<View key={`empty-start-${d}`} style={dayCellStyle} />);
    }

    // 2. Add actual day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayIndex = (startingDay + day - 1) % 7;
      const currentCrudeDate: CrudeDate = [year, date.getMonth(), day];

      const selected =
        selectedDate && isSameDay(currentCrudeDate, selectedDate);

      const backgroundColor = selected
        ? theme.backgroundAccent + "88"
        : currentDayIndex === 0 || currentDayIndex === 6
          ? theme.backgroundSecondary
          : theme.background;

      // Find events for this specific day using the imported events array
      const daysEvents = events.filter((e: CalendarEvent) =>
        isSameDay(currentCrudeDate, e.date),
      );

      dayCells.push(
        <View
          key={`day-${day}`}
          onLayout={(event) => {
            dayLayoutsRef.current[`${i}-${day}`] = {
              y: event.nativeEvent.layout.y,
              height: event.nativeEvent.layout.height,
            };
          }}
          style={[dayCellStyle, { backgroundColor }]}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              borderWidth: selected ? 2 : 0.5,
              borderColor: selected
                ? theme.backgroundAccent
                : theme.backgroundSecondary,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              color: theme.text,
              alignSelf: "center",
            }}
          >
            {day}
          </Text>
          <Pressable
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              zIndex: 1,
            }}
            onPress={() => {
              if (selected) return setSelectedDate(null);
              setSelectedDate(currentCrudeDate);

              // compute centered scroll position for this day
              const layout = dayLayoutsRef.current[`${i}-${day}`];
              const monthY = monthYsRef.current[i];
              if (
                layout &&
                typeof monthY === "number" &&
                scrollViewRef.current
              ) {
                const absoluteY = monthY + layout.y;
                let target = absoluteY;
                if (scrollViewHeight) {
                  // position the pressed day at ~33% from the top of the ScrollView
                  target =
                    absoluteY - scrollViewHeight * 0.1 + layout.height / 2;
                  if (target < 0) target = 0;
                }
                scrollViewRef.current.scrollTo({ y: target, animated: true });
              }
            }}
          />
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              flexWrap: "wrap",
              alignContent: "center",
              justifyContent: "center",
            }}
          >
            {daysEvents.map((event) => (
              <View
                key={event.id}
                style={[
                  {
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginHorizontal: 2,
                    backgroundColor: getColor(event.type),
                  },
                ]}
              />
            ))}
          </View>
        </View>,
      );
    }

    // 3. Add empty padding cells to finish the grid row if needed
    const totalCells = dayCells.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 0; d < remainingCells; d++) {
      dayCells.push(<View key={`empty-end-${d}`} style={dayCellStyle} />);
    }

    months.push(
      <View
        key={i}
        onLayout={(event) => {
          monthYsRef.current[i] = event.nativeEvent.layout.y;
          // auto-scroll once to the current month (i === 0)
          if (i === 0 && !initialScrolledRef.current && scrollViewRef.current) {
            const y = event.nativeEvent.layout.y;
            scrollViewRef.current.scrollTo({ y, animated: false });
            initialScrolledRef.current = true;
          }
        }}
        style={{
          marginBottom: 30,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            marginBottom: 10,
            paddingLeft: 5,
            color: theme.text,
          }}
        >
          {monthName} {year}
        </Text>

        {/* Weekday Labels Headers */}
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: theme.backgroundSecondary,
            paddingBottom: 5,
          }}
        >
          {dayLabels.map((label) => (
            <View
              key={label}
              style={[
                dayCellStyle,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: theme.textSecondary,
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Days Grid */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          {dayCells}
        </View>
      </View>,
    );
  }

  const selectedDaysEvents = events.filter((e: CalendarEvent) =>
    isSameDay(lastSelectedDate, e.date),
  );

  return (
    <Layout>
      <SafeAreaView
        style={{
          flex: 1,
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
          contentContainerStyle={{
            padding: 16,
          }}
        >
          {months}
        </ScrollView>
        <Animated.View
          pointerEvents={selectedDate ? "auto" : "none"}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: menuHeight,
            backgroundColor: theme.backgroundSecondary,
            borderTopColor: theme.textSecondary,
            borderTopWidth: 1,
            padding: 32,
            transform: [{ translateY: menuTranslate }],
          }}
        >
          <Pressable
            style={{ position: "absolute", top: 16, right: 16 }}
            onPress={() => setSelectedDate(null)}
          >
            <FontAwesomeFreeSolid
              name="close"
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
          <Text
            style={{
              color: theme.text,
              fontWeight: "600",
              fontSize: 24,
              marginBottom: 32,
            }}
          >
            Events for{" "}
            {new Date(...lastSelectedDate).toLocaleString("default", {
              month: "short",
            })}{" "}
            {lastSelectedDate[2]}, {lastSelectedDate[0]}
          </Text>
          {selectedDaysEvents.length === 0 && (
            <Text
              style={{
                fontSize: 16,
                color: theme.textSecondary,
                fontStyle: "italic",
              }}
            >
              You have nothing for this day!
            </Text>
          )}
          {selectedDaysEvents.map((event) => (
            <View
              key={event.id}
              style={{
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <View
                style={{
                  marginTop: 4,
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  marginHorizontal: 2,
                  backgroundColor: getColor(event.type),
                }}
              />
              <View style={{ flex: 1, flexDirection: "column", gap: 8 }}>
                <Text style={{ fontSize: 16, color: theme.text }}>
                  {event.name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.textSecondary,
                    fontStyle: "italic",
                  }}
                >
                  {
                    {
                      eviction: "From eviction notice",
                      lease: "From lease agreement",
                    }[event.document]
                  }
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </SafeAreaView>
    </Layout>
  );
}
