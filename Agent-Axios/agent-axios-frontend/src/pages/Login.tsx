import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await register({ 
        email, 
        password, 
        firstName, 
        lastName,
        company: company || undefined 
      });
      navigate("/dashboard");
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="glass bg-card/95 rounded-3xl shadow-2xl p-8 border-2 border-border/50 backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary via-primary to-accent rounded-3xl flex items-center justify-center mb-5 shadow-2xl shadow-primary/30 ring-4 ring-primary/10 animate-pulse-glow">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
              CVE Analyzer
            </h1>
            <p className="text-muted-foreground text-center text-sm leading-relaxed max-w-xs">
              AI-powered vulnerability analysis for your repositories
            </p>
          </div>

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Demo Credentials Info */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-2">
                <p className="text-xs font-medium text-primary mb-1">Demo Credentials:</p>
                <p className="text-xs text-muted-foreground">
                  Email: <span className="font-mono font-semibold">admin@agentaxios.com</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Password: <span className="font-mono font-semibold">any password</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-secondary/30 border-2 border-border hover:border-primary/50 focus:border-primary transition-all duration-200 rounded-xl"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-secondary/30 border-2 border-border hover:border-primary/50 focus:border-primary transition-all duration-200 rounded-xl"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary-hover hover:to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-semibold">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 bg-secondary/30 border-2 border-border hover:border-primary/50 focus:border-primary transition-all duration-200 rounded-xl"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-semibold">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 bg-secondary/30 border-2 border-border hover:border-primary/50 focus:border-primary transition-all duration-200 rounded-xl"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-semibold">
                  Company (Optional)
                </Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Acme Inc."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-12 bg-secondary/30 border-2 border-border hover:border-primary/50 focus:border-primary transition-all duration-200 rounded-xl"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-sm font-semibold">
                  Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-secondary/30 border-2 border-border hover:border-primary/50 focus:border-primary transition-all duration-200 rounded-xl"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-sm font-semibold">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-secondary/30 border-2 border-border hover:border-primary/50 focus:border-primary transition-all duration-200 rounded-xl"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary-hover hover:to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          )}

          {/* Footer */}
          {isLogin && (
            <div className="mt-6 text-center">
              <button 
                type="button"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t-2 border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary-hover font-semibold transition-colors underline-offset-2 hover:underline"
                disabled={isLoading}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
              <Shield className="w-4 h-4 text-success" />
            </div>
            <span className="font-medium">Secure</span>
          </div>
          <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;