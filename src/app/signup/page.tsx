
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/data/mock-data";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const roles: UserRole[] = ['Admin', 'Inspector', 'Valuation'];

const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  companyName: z.string().min(1, { message: "Company name is required." }),
  role: z.enum(roles, { errorMap: () => ({ message: "Please select a role." }) }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { signup, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      companyName: "",
      role: undefined,
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    const result = await signup({
      email: values.email,
      password: values.password, // Pass plain text password for mock
      companyName: values.companyName,
      role: values.role,
    });

    if (!result.success) {
      toast({
        title: t('signupFailedTitle', "Signup Failed"),
        description: result.message || t('genericError', "An error occurred."),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('signupSuccessTitle', "Signup Successful"),
        description: t('signupSuccessDesc', "You have been signed up and logged in."),
      });
      // AuthProvider handles redirect
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-center">{t('signupTitle', 'Create an Account')}</CardTitle>
          <CardDescription className="text-center">
            {t('signupDesc', 'Join Asset Inspector Pro today.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('emailLabel', 'Email')}</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('passwordLabel', 'Password')}</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('companyNameLabel', 'Company Name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('companyNamePlaceholder', 'Your Company LLC')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('roleLabel', 'Role')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectRolePlaceholder', 'Select your role')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(role.toLowerCase() + 'Role', role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                {t('signupButton', 'Sign Up')}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('alreadyHaveAccountPrompt', 'Already have an account?')}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('loginLink', 'Log in')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

