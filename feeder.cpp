#include <iostream>
#include <websocketpp/client.hpp>

int main() {
    // Create a WebSocket client endpoint
    websocketpp::client client;

    try {
        // Initialize the client
        client.init_asio();

        // Create a connection handle
        websocketpp::connection_hdl handle;

        // Connect to the WebSocket server
        client.connect(handle, "ws://127.0.0.1:8080");

        // Start the client event loop
        client.run();

        // Send a message to the server
        client.send(handle, "Hello, server!");

        // Receive a message from the server
        client.set_message_handler([&](websocketpp::connection_hdl hdl, websocketpp::client<websocketpp::config::asio_client>::message_ptr msg) {
            std::cout << "Received message from server: " << msg->get_payload() << std::endl;
        });

        while (true) {
            std::string input;
            // read line from stdin
            std::getline(std::cin, input);
            // Send a message to the server
            client.send(handle, input);

            // Sleep for 1 second
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }

        // Close the WebSocket connection
        client.close(handle, websocketpp::close::status::normal, "Client closing");

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}