<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFlashCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled explicitly in controller via policy
        return true;
    }

    public function rules(): array
    {
        return [
            'resource_id' => ['required', 'string', 'exists:resources,id'],
            'front' => ['required', 'string', 'max:2000'],
            'back' => ['required', 'string', 'max:2000'],
        ];
    }
}
