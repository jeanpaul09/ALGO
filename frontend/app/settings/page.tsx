'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure your trading lab</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>API keys and risk parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-semibold">API Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    API keys and secrets are managed on the backend for security. See backend/.env for configuration.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-semibold">Risk Limits</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure risk parameters in the backend environment variables:
                  </p>
                  <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                    <li>MAX_POSITION_SIZE_USD</li>
                    <li>MAX_DAILY_LOSS_USD</li>
                    <li>ENABLE_LIVE_TRADING</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
