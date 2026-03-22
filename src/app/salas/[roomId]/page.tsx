import { RoomScreen } from "../../../components/room-screen";

export default async function RoomPage(props: PageProps<"/salas/[roomId]">) {
  const { roomId } = await props.params;

  return <RoomScreen roomId={roomId} />;
}
