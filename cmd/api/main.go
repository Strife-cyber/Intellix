package main

import (
	"fmt"
	"micro-cer/internal/api/routes"
	"micro-cer/internal/config"
	"net/http"
)

func main() {
	config.LoadEnv()

	router := routes.GetAppRouter()

	fmt.Println("Server running on port 8080")
	err := http.ListenAndServe(":8080", router)
	if err != nil {
		return
	}
}
