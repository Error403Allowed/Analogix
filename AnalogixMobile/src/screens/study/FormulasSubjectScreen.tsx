import { useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function FormulasSubjectScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const subjectId = route.params?.subjectId;

  useEffect(() => {
    navigation.replace("Formulas", { subjectId });
  }, [navigation, subjectId]);

  return null;
}
