"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip } from "lucide-react";

const emailFormSchema = z.object({
  to: z.string().email({ message: "Must be a valid email address." }),
  subject: z.string().min(1, { message: "Subject is required." }),
  body: z.string().min(1, { message: "Email body cannot be empty." }),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
  })).optional(),
});

export type EmailFormValues = z.infer<typeof emailFormSchema>;

interface EmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Partial<EmailFormValues>;
  onSend: (data: EmailFormValues) => Promise<void>;
  isSending: boolean;
}

const EmailDialog: React.FC<EmailDialogProps> = ({
  isOpen,
  onOpenChange,
  initialData,
  onSend,
  isSending,
}) => {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: initialData.body || "",
      attachments: initialData.attachments || [],
    },
    values: { // Use values to ensure form updates when initialData changes
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: initialData.body || "",
      attachments: initialData.attachments || [],
    },
  });

  const handleSubmit = async (data: EmailFormValues) => {
    await onSend(data);
    form.reset(); // Reset form after sending
  };

  React.useEffect(() => {
    if (!isOpen) {
      form.reset(); // Reset form when dialog closes
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            This is a simulated email system. The email content will be logged to the console.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea rows={8} {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("attachments") && form.watch("attachments")!.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Attachments</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {form.watch("attachments")!.map((attachment, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="underline">
                        {attachment.name}
                      </a>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  "Send Email"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailDialog;