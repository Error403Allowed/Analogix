import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Text, useTheme, FAB, ActivityIndicator, Portal, Modal, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigation } from "@react-navigation/native";
import { ROOMS, CREATE_ROOM, JOIN_ROOM, PUBLIC_ROOMS } from "../../graphql/queries/room";
import { SHAPE } from "../../theme/tokens";
import { SkeletonList } from "../../components/SkeletonLoader";
import {
  ExpressiveEmptyState,
  ExpressiveHeroPanel,
  ExpressiveListRow,
  ExpressiveScreen,
  ExpressiveSection,
} from "../../components/expressive";

export default function RoomsListScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const { data, loading, refetch } = useQuery(ROOMS);
  const { data: publicData } = useQuery(PUBLIC_ROOMS);
  const [createRoom, { loading: creating }] = useMutation(CREATE_ROOM);
  const [joinRoom, { loading: joining }] = useMutation(JOIN_ROOM);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [joinCode, setJoinCode] = useState("");

  const rooms = data?.rooms ?? [];
  const publicRooms = publicData?.publicRooms ?? [];

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const { data: created } = await createRoom({
        variables: { input: { title: title.trim(), topic: topic.trim() || undefined, visibility } },
      });
      const room = created?.createRoom;
      setShowCreate(false);
      setTitle("");
      setTopic("");
      refetch();
      if (room?.id) {
        navigation.navigate("RoomDetail", { roomId: room.id, name: room.title, initialData: room });
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not create room.");
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const { data: joined } = await joinRoom({ variables: { joinCode: joinCode.trim().toUpperCase() } });
      const room = joined?.joinRoom;
      setShowJoin(false);
      setJoinCode("");
      refetch();
      if (room?.id) {
        navigation.navigate("RoomDetail", { roomId: room.id, name: room.title, initialData: room });
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not join room.");
    }
  };

  return (
    <ExpressiveScreen
      title="Rooms"
      subtitle="Study together in real time"
      leadingIcon="account-group"
      fab={
        <FAB
          icon="plus"
          label="New room"
          color={paperTheme.colors.onPrimary}
          style={{ backgroundColor: paperTheme.colors.primary, borderRadius: SHAPE.lg }}
          onPress={() => setShowCreate(true)}
        />
      }
    >
      <ExpressiveHeroPanel accent="secondary" style={styles.hero}>
        <Text variant="headlineSmall" style={{ color: paperTheme.colors.onSecondaryContainer, fontWeight: "900" }}>
          Shared focus, shared notes.
        </Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSecondaryContainer }}>
          Create a room for group chat, documents, and timers.
        </Text>
        <Button mode="contained-tonal" icon="login" onPress={() => setShowJoin(true)} style={{ alignSelf: "flex-start", borderRadius: SHAPE.lg }}>
          Join with code
        </Button>
      </ExpressiveHeroPanel>

      <ExpressiveSection title="Your rooms">
        <View style={styles.list}>
          {loading ? (
            <SkeletonList count={3} style={{ marginTop: 12 }} />
          ) : rooms.length === 0 ? (
            <ExpressiveEmptyState icon="account-group" title="No rooms yet" subtitle="Create one to invite friends." />
          ) : (
            rooms.map((r: any) => (
              <ExpressiveListRow
                key={r.id}
                title={r.title ?? r.name}
                subtitle={`${r.memberCount ?? 0} members · ${r.topic ?? r.subject ?? "General"}`}
                icon="account-group"
                onPress={() => navigation.navigate("RoomDetail", { roomId: r.id, name: r.title ?? r.name })}
              />
            ))
          )}
        </View>
      </ExpressiveSection>

      {publicRooms.length > 0 && (
        <ExpressiveSection title="Public rooms">
          <View style={styles.list}>
            {publicRooms.map((r: any) => (
              <ExpressiveListRow
                key={r.id}
                title={r.title}
                subtitle={`${r.memberCount ?? 0} members · Code: ${r.joinCode}`}
                icon="earth"
                onPress={() => navigation.navigate("RoomDetail", { roomId: r.id, name: r.title })}
              />
            ))}
          </View>
        </ExpressiveSection>
      )}

      <Portal>
        <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Create room</Text>
          <TextInput mode="outlined" label="Title" value={title} onChangeText={setTitle} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Topic (optional)" value={topic} onChangeText={setTopic} style={{ marginBottom: 12 }} />
          <SegmentedButtons
            value={visibility}
            onValueChange={setVisibility}
            buttons={[
              { value: "public", label: "Public" },
              { value: "private", label: "Private" },
            ]}
            style={{ marginBottom: 16 }}
          />
          <Button mode="contained" loading={creating} onPress={handleCreate} disabled={!title.trim()}>
            Create
          </Button>
        </Modal>

        <Modal visible={showJoin} onDismiss={() => setShowJoin(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Join room</Text>
          <TextInput mode="outlined" label="Invite code" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" style={{ marginBottom: 16 }} />
          <Button mode="contained" loading={joining} onPress={handleJoin} disabled={!joinCode.trim()}>
            Join
          </Button>
        </Modal>
      </Portal>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 170, gap: 8, justifyContent: "center" },
  list: { gap: 8 },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
});
