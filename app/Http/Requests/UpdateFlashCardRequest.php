<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFlashCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'front' => ['sometimes', 'required', 'string', 'max:2000'],
            'back'  => ['sometimes', 'required', 'string', 'max:2000'],
        ];
    }
}
