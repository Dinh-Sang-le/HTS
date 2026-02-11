"use client";

import { SimpleGrid, Paper, Text } from "@mantine/core";
import { motion } from "framer-motion";

function Card({ title, value }: { title: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.03 }}
    >
      <Paper withBorder radius="lg" p="md">
        <Text size="sm" c="dimmed">{title}</Text>
        <Text size="xl" fw={800}>{value}</Text>
      </Paper>
    </motion.div>
  );
}

export function KpiCards() {
  return (
    <SimpleGrid cols={{ base: 1, md: 3 }}>
      <Card title="Balance" value="$25,430" />
      <Card title="Equity" value="$24,990" />
      <Card title="Open P/L" value="+$430" />
    </SimpleGrid>
  );
}
