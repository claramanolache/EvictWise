import { View, StyleSheet } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { setEvictionNotice, setLeaseAgreement } from "../slice";
import Layout from "@/components/Layout";
import Upload from "@/components/Upload";
import { RootState } from "@/store";

export default function Documents() {
  const evictionNotice = useSelector(
    (state: RootState) => state.app.evictionNotice,
  );
  const leaseAgreement = useSelector(
    (state: RootState) => state.app.leaseAgreement,
  );
  const dispatch = useDispatch();

  return (
    <Layout>
      <View
        style={{
          paddingVertical: 16,
          paddingHorizontal: 32,
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <Upload
          title="Eviction Notice"
          current={evictionNotice}
          set={(file) => dispatch(setEvictionNotice(file))}
          document="eviction"
        />
        <Upload
          title="Lease Agreement"
          current={leaseAgreement}
          set={(file) => dispatch(setLeaseAgreement(file))}
          document="lease"
        />
      </View>
    </Layout>
  );
}
