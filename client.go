package main

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func main() {
	mu := &sync.Mutex{}
	// Create a new WebSocket dialer
	dialer := websocket.DefaultDialer

	// Set up the WebSocket connection
	conn, _, err := dialer.Dial("ws://localhost:8080", nil)
	if err != nil {
		log.Fatal("Failed to connect to WebSocket server:", err)
	}
	defer conn.Close()

	// Start a goroutine to handle incoming messages
	go func() {
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Println("Failed to read message from WebSocket:", err)
				return
			}
			mu.Lock()
			fmt.Println("Received message:", string(message))
			mu.Unlock()
		}
	}()

	// Send a message every second
	for {
		// Read a line from console input
		var input string
		mu.Lock()
		fmt.Print("Enter a message: ")
		_, err = fmt.Scanln(&input)
		mu.Unlock()
		if err != nil {
			log.Println("Failed to read input:", err)
			continue
		}
		err = conn.WriteMessage(websocket.TextMessage, []byte(input))
		if err != nil {
			log.Println("Failed to send message:", err)
			continue
		}
		time.Sleep(time.Second)
	}
}
