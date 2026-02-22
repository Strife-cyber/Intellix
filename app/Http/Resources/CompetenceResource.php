<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompetenceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'prosit_id' => $this->prosit_id,
            'title' => $this->title,
            'description' => $this->description,
            'taxonomy_level' => $this->taxonomy_level,
            'weight' => $this->weight,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
