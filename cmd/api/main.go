package main

import (
	"fmt"
	"micro-cer/internal/api/routes"
	"net/http"
)

func main() {
	router := routes.GetAppRouter()

	fmt.Println("Server running on port 8080")
	err := http.ListenAndServe(":8080", router)
	if err != nil {
		return
	}
}
