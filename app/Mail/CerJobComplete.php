<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CerJobComplete extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public string $jobId,
        public string $title,
        public string $userName,
        public string $pdfUrl,
        public string $latexUrl,
        public string $appUrl,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "✅ \"{$this->title}\" — Your CER has been generated",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            html: 'emails.cer-job-complete',
            with: [
                'jobId' => $this->jobId,
                'title' => $this->title,
                'userName' => $this->userName,
                'pdfUrl' => $this->pdfUrl,
                'latexUrl' => $this->latexUrl,
                'appUrl' => $this->appUrl,
                'year' => now()->format('Y'),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
