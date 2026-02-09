import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Mail,
  Save,
  Key
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [autoScan, setAutoScan] = useState(true);
  const [scanFrequency, setScanFrequency] = useState("daily");

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully!");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  const handleSaveSecurity = () => {
    toast.success("Security settings updated!");
  };

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings" },
      ]}
    >
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
                  <p className="text-muted-foreground">Manage your account settings and preferences</p>
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                    <TabsTrigger value="profile" className="gap-2">
                      <User className="w-4 h-4" />
                      Profile
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                      <Bell className="w-4 h-4" />
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                      <Shield className="w-4 h-4" />
                      Security
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="gap-2">
                      <Palette className="w-4 h-4" />
                      Preferences
                    </TabsTrigger>
                  </TabsList>

                  {/* Profile Settings */}
                  <TabsContent value="profile" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal information and profile details</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                            <User className="w-10 h-10 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <Button variant="outline" size="sm">Upload Photo</Button>
                            <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" defaultValue="John" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" defaultValue="Doe" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" defaultValue="john.doe@example.com" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input id="company" defaultValue="Acme Inc." />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Input id="bio" defaultValue="Security enthusiast and developer" />
                        </div>

                        <Button onClick={handleSaveProfile} className="gap-2">
                          <Save className="w-4 h-4" />
                          Save Changes
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Plan & Billing</CardTitle>
                        <CardDescription>Manage your subscription and billing information</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                          <div>
                            <div className="font-semibold text-lg">Pro Plan</div>
                            <div className="text-sm text-muted-foreground">$29/month • Billed monthly</div>
                          </div>
                          <Button variant="outline">Manage Plan</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Notifications Settings */}
                  <TabsContent value="notifications" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Email Notifications</CardTitle>
                        <CardDescription>Configure which email notifications you want to receive</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">Vulnerability Alerts</div>
                            <div className="text-sm text-muted-foreground">Get notified when new vulnerabilities are found</div>
                          </div>
                          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">Weekly Reports</div>
                            <div className="text-sm text-muted-foreground">Receive weekly summary of your scans</div>
                          </div>
                          <Switch checked={weeklyReports} onCheckedChange={setWeeklyReports} />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">Push Notifications</div>
                            <div className="text-sm text-muted-foreground">Enable browser push notifications</div>
                          </div>
                          <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                        </div>

                        <Button onClick={handleSaveNotifications} className="gap-2">
                          <Save className="w-4 h-4" />
                          Save Preferences
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Notification Email</CardTitle>
                        <CardDescription>Choose where to receive notifications</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="notification-email">Email Address</Label>
                          <div className="flex gap-2">
                            <Input 
                              id="notification-email" 
                              type="email" 
                              defaultValue="john.doe@example.com"
                              className="flex-1"
                            />
                            <Button variant="outline">
                              <Mail className="w-4 h-4 mr-2" />
                              Verify
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Security Settings */}
                  <TabsContent value="security" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Password</CardTitle>
                        <CardDescription>Change your password to keep your account secure</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <Input id="current-password" type="password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input id="new-password" type="password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input id="confirm-password" type="password" />
                        </div>
                        <Button className="gap-2">
                          <Key className="w-4 h-4" />
                          Update Password
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Two-Factor Authentication</CardTitle>
                        <CardDescription>Add an extra layer of security to your account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                          <div>
                            <div className="font-medium">2FA Status</div>
                            <div className="text-sm text-muted-foreground">Currently disabled</div>
                          </div>
                          <Button variant="outline">Enable 2FA</Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>API Keys</CardTitle>
                        <CardDescription>Manage API keys for programmatic access</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 bg-secondary rounded-lg font-mono text-sm">
                          sk_live_********************************
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline">Generate New Key</Button>
                          <Button variant="outline">Revoke Key</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Preferences Settings */}
                  <TabsContent value="preferences" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>Customize how the application looks</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label>Theme</Label>
                          <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Scanning Preferences</CardTitle>
                        <CardDescription>Configure automatic scanning behavior</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">Automatic Scanning</div>
                            <div className="text-sm text-muted-foreground">Enable automatic vulnerability scans</div>
                          </div>
                          <Switch checked={autoScan} onCheckedChange={setAutoScan} />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label>Scan Frequency</Label>
                          <Select value={scanFrequency} onValueChange={setScanFrequency} disabled={!autoScan}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Every Hour</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button onClick={handleSaveSecurity} className="gap-2">
                          <Save className="w-4 h-4" />
                          Save Preferences
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-destructive/50">
                      <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>Irreversible actions that affect your account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Delete Account</div>
                            <div className="text-sm text-muted-foreground">Permanently delete your account and all data</div>
                          </div>
                          <Button variant="destructive">Delete Account</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
      </div>
    </PageLayout>
  );
};

export default Settings;
